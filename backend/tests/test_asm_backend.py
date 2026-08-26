"""Backend tests for ASM Nöbet Çizelgesi API."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://aile-sagligi-takvim.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Health ----------
def test_health(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---------- Auth / PIN ----------
class TestAuth:
    def test_a_status_initial_false(self, s):
        r = s.get(f"{API}/auth/status")
        assert r.status_code == 200
        # is_setup should be false because DB was cleaned before run
        assert r.json() == {"is_setup": False}

    def test_b_setup_pin(self, s):
        r = s.post(f"{API}/auth/setup", json={"pin": "1234"})
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_c_status_after_setup(self, s):
        r = s.get(f"{API}/auth/status")
        assert r.status_code == 200
        assert r.json() == {"is_setup": True}

    def test_d_setup_twice_fails(self, s):
        r = s.post(f"{API}/auth/setup", json={"pin": "9999"})
        assert r.status_code == 400

    def test_e_verify_correct(self, s):
        r = s.post(f"{API}/auth/verify", json={"pin": "1234"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_f_verify_wrong(self, s):
        r = s.post(f"{API}/auth/verify", json={"pin": "0000"})
        assert r.status_code == 401


# ---------- Physicians CRUD ----------
class TestPhysicians:
    created_ids = []

    def test_a_create(self, s):
        r = s.post(f"{API}/physicians", json={"name": "TEST_Dr_Ali", "code": "A", "color": "#FF5733"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "TEST_Dr_Ali"
        assert data["code"] == "A"
        assert data["color"] == "#FF5733"
        assert "id" in data
        TestPhysicians.created_ids.append(data["id"])

    def test_b_list_contains_created(self, s):
        r = s.get(f"{API}/physicians")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert TestPhysicians.created_ids[0] in ids

    def test_c_update(self, s):
        pid = TestPhysicians.created_ids[0]
        r = s.patch(f"{API}/physicians/{pid}", json={"code": "AL"})
        assert r.status_code == 200
        assert r.json()["code"] == "AL"
        # verify persistence
        r2 = s.get(f"{API}/physicians")
        item = next(p for p in r2.json() if p["id"] == pid)
        assert item["code"] == "AL"

    def test_d_create_second(self, s):
        r = s.post(f"{API}/physicians", json={"name": "TEST_Dr_Bora", "code": "B", "color": "#3366FF"})
        assert r.status_code == 200
        TestPhysicians.created_ids.append(r.json()["id"])


# ---------- Template ----------
class TestTemplate:
    def test_a_put_template(self, s):
        pids = TestPhysicians.created_ids
        tpl = {"1": [pids[0]], "2": [pids[1]], "3": [pids[0], pids[1]], "4": [], "5": [pids[0]], "6": [], "7": []}
        r = s.put(f"{API}/template", json={"template": tpl})
        assert r.status_code == 200
        assert r.json()["template"] == tpl

    def test_b_get_template(self, s):
        r = s.get(f"{API}/template")
        assert r.status_code == 200
        tpl = r.json()["template"]
        assert tpl["1"] == [TestPhysicians.created_ids[0]]
        assert tpl["3"] == TestPhysicians.created_ids


# ---------- Assignments ----------
class TestAssignments:
    def test_a_put_single(self, s):
        r = s.put(f"{API}/assignments/2026-01-05",
                  json={"date": "2026-01-05", "physician_ids": [TestPhysicians.created_ids[0]]})
        assert r.status_code == 200

    def test_b_bulk(self, s):
        items = [
            {"date": "2026-01-06", "physician_ids": [TestPhysicians.created_ids[1]]},
            {"date": "2026-01-07", "physician_ids": TestPhysicians.created_ids},
        ]
        r = s.post(f"{API}/assignments/bulk", json=items)
        assert r.status_code == 200
        assert r.json()["count"] == 2

    def test_c_list(self, s):
        r = s.get(f"{API}/assignments", params={"year": 2026, "month": 1})
        assert r.status_code == 200
        rows = r.json()
        dates = {row["date"] for row in rows}
        assert {"2026-01-05", "2026-01-06", "2026-01-07"}.issubset(dates)


# ---------- Holidays ----------
class TestHolidays:
    def test_a_mark_holiday_clears_assignment(self, s):
        # ensure there is an assignment on 2026-01-07
        r0 = s.get(f"{API}/assignments", params={"year": 2026, "month": 1})
        assert any(x["date"] == "2026-01-07" for x in r0.json())
        r = s.put(f"{API}/holidays/2026-01-07", json={"date": "2026-01-07", "is_holiday": True, "label": "İdari İzin"})
        assert r.status_code == 200
        # assignment for that date should be gone
        r2 = s.get(f"{API}/assignments", params={"year": 2026, "month": 1})
        assert not any(x["date"] == "2026-01-07" for x in r2.json())
        # holidays list should include it
        r3 = s.get(f"{API}/holidays", params={"year": 2026, "month": 1})
        assert any(x["date"] == "2026-01-07" and x["is_holiday"] for x in r3.json())

    def test_b_unmark_holiday(self, s):
        r = s.put(f"{API}/holidays/2026-01-07", json={"date": "2026-01-07", "is_holiday": False})
        assert r.status_code == 200
        r2 = s.get(f"{API}/holidays", params={"year": 2026, "month": 1})
        assert not any(x["date"] == "2026-01-07" for x in r2.json())


# ---------- Cascade delete ----------
class TestCascadeDelete:
    def test_delete_physician_cascades(self, s):
        pid = TestPhysicians.created_ids[0]
        # Ensure it's in template and an assignment
        s.put(f"{API}/assignments/2026-01-10",
              json={"date": "2026-01-10", "physician_ids": TestPhysicians.created_ids})
        r = s.delete(f"{API}/physicians/{pid}")
        assert r.status_code == 200
        # Not in physicians list
        r2 = s.get(f"{API}/physicians")
        assert not any(p["id"] == pid for p in r2.json())
        # Not in template
        tpl = s.get(f"{API}/template").json()["template"]
        for k, v in tpl.items():
            assert pid not in v, f"template day {k} still has deleted pid"
        # Not in assignment
        rows = s.get(f"{API}/assignments", params={"year": 2026, "month": 1}).json()
        row = next((x for x in rows if x["date"] == "2026-01-10"), None)
        assert row is not None
        assert pid not in row["physician_ids"]

    def test_delete_missing_physician(self, s):
        r = s.delete(f"{API}/physicians/non-existent-id")
        assert r.status_code == 404

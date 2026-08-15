from app.database import SessionLocal, engine, Base
from app.models import Department

Base.metadata.create_all(bind=engine)

def seed_departments():
    db = SessionLocal()
    try:
        dept_data = [
            {"name": "Water Supply", "username": "water_admin", "password_hash": "water123"},
            {"name": "Road Maintenance", "username": "road_admin", "password_hash": "road123"},
            {"name": "Gas & Energy", "username": "gas_admin", "password_hash": "gas123"},
            {"name": "Sanitation", "username": "sanitation_admin", "password_hash": "sanitation123"},
            {"name": "Electricity Board", "username": "electric_admin", "password_hash": "electric123"},
            {"name": "Public Safety", "username": "police_admin", "password_hash": "police123"},
        ]

        for item in dept_data:
            existing = db.query(Department).filter(
                (Department.name == item["name"]) | (Department.username == item["username"])
            ).first()

            if not existing:
                dept = Department(
                    name=item["name"],
                    username=item["username"],
                    password_hash=item["password_hash"]
                )
                db.add(dept)
                print(f"Created: {item['name']} (User: {item['username']})")
            else:
                # Update credentials if already exists
                existing.username = item["username"]
                existing.password_hash = item["password_hash"]
                print(f"Updated: {item['name']} (User: {item['username']})")

        db.commit()
        print("\nAll department officer accounts seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_departments()
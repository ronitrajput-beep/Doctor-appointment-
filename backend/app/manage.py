import argparse
import getpass
from . import database as db
from .seed import seed, demo_slots
from .security import hash_password
from .excel import export_workbook

parser = argparse.ArgumentParser()
parser.add_argument("command", choices=["init", "export", "demo-slots", "create-admin"])
args = parser.parse_args()
db.initialize()
if args.command == "init":
    seed()
    export_workbook()
elif args.command == "export":
    export_workbook()
elif args.command == "demo-slots":
    demo_slots()
else:
    from pydantic import TypeAdapter, EmailStr

    email = str(TypeAdapter(EmailStr).validate_python(input("Admin email: "))).lower()
    password = getpass.getpass("Password (12+ characters): ")
    if len(password) < 12:
        raise SystemExit("Password too short.")
    with db.transaction() as c:
        c.execute(
            "INSERT INTO users VALUES(?,?,?,?,?,?,?,1)",
            (
                db.uid("U"),
                "Administrator",
                email,
                "+91 00000 00000",
                "admin",
                db.stamp(),
                hash_password(password),
            ),
        )
print("Complete.")

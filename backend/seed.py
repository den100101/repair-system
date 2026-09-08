
from datetime import date, datetime, timedelta
from app import create_app
from extensions import db
from models import (
    User,
    Technician,
    Service,
    Part,
    RepairRequest,
    RepairPart,
    StatusHistory,
    Message,
    Notification,
    Quotation,
    QuotationItem,
)

app = create_app()

with app.app_context():
    db.create_all()

    if User.query.filter_by(email="admin@tapalla-repair.com").first():
        print("Demo data already present — skipping seed.")
    else:
        # --- Staff ---
        admin = User(
            full_name="Ni\u00f1a Rita Tapalla",
            email="admin@tapalla-repair.com",
            phone="+63 908 637 7627",
            role="admin",
        )
        admin.set_password("admin123")

        tech1 = User(full_name="Andrew Tapalla", email="andrew@tapalla-repair.com", role="technician")
        tech1.set_password("tech123")
        tech2 = User(full_name="Michael Tapalla", email="michael@tapalla-repair.com", role="technician")
        tech2.set_password("tech123")

        db.session.add_all([admin, tech1, tech2])
        db.session.flush()

        db.session.add_all(
            [
                Technician(user_id=admin.id, title="Admin", capacity_percent=65),
                Technician(user_id=tech1.id, title="Technician", capacity_percent=85),
                Technician(user_id=tech2.id, title="Technician", capacity_percent=40),
            ]
        )

      
        svc_tv = Service(
            name="TV & Entertainment",
            description="LED, OLED, and Plasma TV repairs. Backlight issues, screen flickering, port replacements.",
            base_price=1200,
            is_active=True,
        )
        svc_kitchen = Service(
            name="Kitchen Appliances",
            description="Microwaves, blenders, and food processors. Quick turnaround for everyday kitchen tools.",
            base_price=800,
            is_active=True,
        )
        svc_large = Service(
            name="Large Appliances",
            description="Washing machines, refrigerators, and dishwashers. Mechanical and electronic troubleshooting.",
            base_price=1500,
            is_active=True,
        )
        svc_audio = Service(
            name="Audio Equipment",
            description="HiFi systems, amplifiers, and professional speakers.",
            base_price=1000,
            is_active=True,
        )
        db.session.add_all([svc_tv, svc_kitchen, svc_large, svc_audio])
        db.session.flush()

        part_led_driver = Part(name="LED Driver Board", sku="LED-DRV-001", stock_qty=14, reorder_level=5, unit_cost=650, unit_price=950)
        part_drain_pump = Part(name="Washing Machine Drain Pump", sku="WM-PUMP-002", stock_qty=6, reorder_level=4, unit_cost=900, unit_price=1300)
        part_capacitor = Part(name="Universal Capacitor 450V", sku="CAP-450V-003", stock_qty=3, reorder_level=8, unit_cost=45, unit_price=120)
        part_remote = Part(name="Universal TV Remote", sku="REM-UNI-004", stock_qty=20, reorder_level=10, unit_cost=80, unit_price=200)
        db.session.add_all([part_led_driver, part_drain_pump, part_capacitor, part_remote])
        db.session.flush()

        customer = User(
            full_name="Juan Dela Cruz",
            email="juan.dcruz@email.com",
            phone="+63 917 123 4567",
            address="123 Mabini St, Barangay 4, Tapalla City",
            role="customer",
        )
        customer.set_password("customer123")
        db.session.add(customer)
        db.session.flush()

       
        repair = RepairRequest(
            order_id="TR-8842-2024",
            customer_id=customer.id,
            technician_id=tech1.id,
            service_id=svc_large.id,
            appliance_category=svc_large.name,
            device_model="Samsung Front-Load Washing Machine (WW90)",
            reported_issue=(
                "The machine stops mid-cycle and displays an 'E4' error code. "
                "There is a burning smell coming from the rear panel. Water "
                "doesn't seem to drain completely before the error occurs."
            ),
            status="In Repair",
            priority="High",
            preferred_date=date.today() + timedelta(days=2),
            preferred_slot="9:00 AM - 10:00 AM",
            est_completion=date.today() + timedelta(days=4),
            estimated_cost=2500,
            free_checkup_eligible=True,
            submitted_at=datetime.utcnow() - timedelta(days=4),
        )
        db.session.add(repair)
        db.session.flush()

        base_time = datetime.utcnow() - timedelta(days=4)
        db.session.add_all(
            [
                StatusHistory(repair_id=repair.id, status="Submitted", actor="Customer", timestamp=base_time),
                StatusHistory(
                    repair_id=repair.id, status="Under Review", actor="Admin (Maria)",
                    timestamp=base_time + timedelta(hours=5),
                ),
                StatusHistory(
                    repair_id=repair.id, status="Approved & Scheduled", actor="Admin (Carlos)",
                    timestamp=base_time + timedelta(days=1),
                ),
                StatusHistory(
                    repair_id=repair.id, status="In Repair", actor="Tech (Rico)",
                    timestamp=base_time + timedelta(days=2),
                ),
            ]
        )

        db.session.add(
            Message(
                repair_id=repair.id,
                sender_name="Andrew Tapalla",
                sender_role="technician",
                content="Technician replaced primary LED driver board.",
                visible_to_customer=True,
                timestamp=datetime.utcnow() - timedelta(hours=2),
            )
        )

        db.session.add_all(
            [
                Notification(repair_id=repair.id, label="Appointment Confirmation", delivery_status="Delivered"),
                Notification(repair_id=repair.id, label="Technician Assigned", delivery_status="Sent"),
                Notification(repair_id=repair.id, label="Status Update: In Repair", delivery_status="Delivered"),
            ]
        )

        # Inventory tied to this job (Inventory Management demo)
        part_drain_pump.stock_qty -= 1
        db.session.add(
            RepairPart(
                repair_id=repair.id,
                part_id=part_drain_pump.id,
                quantity=1,
                unit_price_at_use=part_drain_pump.unit_price,
            )
        )

        # Quotation for this job (Quotation Approval demo)
        quotation = Quotation(
            repair_id=repair.id,
            status="Pending",
            notes="Estimate includes parts and one hour of labor.",
            created_by="Andrew Tapalla",
        )
        db.session.add(quotation)
        db.session.flush()
        db.session.add_all(
            [
                QuotationItem(quotation_id=quotation.id, description="Drain pump replacement (part)", amount=1300),
                QuotationItem(quotation_id=quotation.id, description="Labor (1 hour)", amount=500),
                QuotationItem(quotation_id=quotation.id, description="Diagnostic fee (waived — free check-up)", amount=0),
            ]
        )

        # A second, already-completed repair so reports/revenue have data
        repair2 = RepairRequest(
            order_id="TR-7922-2024",
            customer_id=customer.id,
            technician_id=tech2.id,
            service_id=svc_kitchen.id,
            appliance_category=svc_kitchen.name,
            device_model="Panasonic Inverter Microwave Oven",
            reported_issue="Turntable does not spin and interior light stays off.",
            status="Quality Check & Done",
            priority="Low",
            preferred_date=date.today() - timedelta(days=10),
            preferred_slot="1:00 PM - 2:00 PM",
            est_completion=date.today() - timedelta(days=8),
            estimated_cost=850,
            free_checkup_eligible=False,
            submitted_at=datetime.utcnow() - timedelta(days=12),
            updated_at=datetime.utcnow() - timedelta(days=8),
        )
        db.session.add(repair2)
        db.session.flush()
        db.session.add(
            StatusHistory(repair_id=repair2.id, status="Quality Check & Done", actor="Tech (Michael)",
                          timestamp=datetime.utcnow() - timedelta(days=8))
        )

        db.session.commit()
        print("Seed complete.")
        print("Admin login:    admin@tapalla-repair.com / admin123")
        print("Customer login: juan.dcruz@email.com / customer123")

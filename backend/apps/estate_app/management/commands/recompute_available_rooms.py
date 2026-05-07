# apps/estate_app/management/commands/recompute_available_rooms.py
"""
Management command to recalculate available_rooms for every RoomCategory
based on the count of ACCEPTED reservations.

Usage:
    python manage.py recompute_available_rooms
    python manage.py recompute_available_rooms --dry-run

Run this once after deploying the new schema to bring existing data
into a consistent state.
"""

from django.core.management.base import BaseCommand
from django.db.models import Sum, Q


class Command(BaseCommand):
    help = (
        "Recompute available_rooms for every RoomCategory "
        "based on ACCEPTED reservations."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Print what would change without actually saving.",
        )

    def handle(self, *args, **options):
        from apps.estate_app.models import RoomCategory, Reservation

        dry_run = options['dry_run']
        updated = 0
        errors  = 0

        room_categories = RoomCategory.objects.all().select_related('estate')

        for rc in room_categories:
            # Sum num_rooms across all ACCEPTED reservations for this category
            accepted_agg = Reservation.objects.filter(
                room_category=rc,
                status='ACCEPTED',
            ).aggregate(total=Sum('num_rooms'))

            accepted_rooms = accepted_agg['total'] or 0
            new_available  = max(0, rc.total_rooms - accepted_rooms)

            if new_available != rc.available_rooms:
                if dry_run:
                    self.stdout.write(
                        f"[DRY-RUN] {rc.estate.name} / {rc.name}: "
                        f"available_rooms {rc.available_rooms} → {new_available} "
                        f"(total={rc.total_rooms}, accepted={accepted_rooms})"
                    )
                else:
                    try:
                        rc.available_rooms  = new_available
                        rc.available_quantity = new_available
                        rc.quantity_available = new_available
                        rc.save(update_fields=[
                            'available_rooms', 'available_quantity', 'quantity_available'
                        ])
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Updated {rc.estate.name} / {rc.name}: "
                                f"available_rooms → {new_available}"
                            )
                        )
                        updated += 1
                    except Exception as exc:
                        self.stderr.write(
                            self.style.ERROR(
                                f"Error updating {rc.name} (id={rc.id}): {exc}"
                            )
                        )
                        errors += 1

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nDone. {updated} updated, {errors} errors."
                )
            )
        else:
            self.stdout.write("\n[DRY-RUN] No changes saved.")

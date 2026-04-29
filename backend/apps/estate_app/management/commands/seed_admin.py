from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

class Command(BaseCommand):
    help = 'Seeds an initial admin user'

    def handle(self, *args, **options):
        User = get_user_model()
        
        # Get credentials from environment variables
        username = os.environ.get('ADMIN_USERNAME')
        email    = os.environ.get('ADMIN_EMAIL')
        password = os.environ.get('ADMIN_PASSWORD')

        if not all([username, email, password]):
            self.stdout.write(self.style.ERROR('Error: ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in the environment.'))
            return

        if not User.objects.filter(username=username).exists():
            self.stdout.write(self.style.NOTICE(f'Creating superuser {username}...'))
            User.objects.create_superuser(
                username=username, 
                email=email, 
                password=password
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully created admin user: {username}'))
        else:
            self.stdout.write(self.style.WARNING(f'Admin user "{username}" already exists. Skipping seeder.'))

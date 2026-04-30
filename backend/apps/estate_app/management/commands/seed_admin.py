from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decouple import config

class Command(BaseCommand):
    help = 'Seeds an initial admin user'

    def handle(self, *args, **options):
        User = get_user_model()
        
        # Get credentials from environment variables with fallbacks
        username = config('ADMIN_USERNAME', default='admin')
        email    = config('ADMIN_EMAIL',    default='admin@eyangestate.com')
        password = config('ADMIN_PASSWORD', default='adminpassword123')

        self.stdout.write(self.style.NOTICE(f'Using credentials: {username} / {email}'))

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

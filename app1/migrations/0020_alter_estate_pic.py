# Generated by Django 5.1 on 2025-01-25 20:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app1', '0019_alter_estate_pic'),
    ]

    operations = [
        migrations.AlterField(
            model_name='estate',
            name='pic',
            field=models.ImageField(blank=True, null=True, upload_to='estates/'),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estate_app', '0007_messageattachment'),
    ]

    operations = [
        migrations.AddField(
            model_name='estate',
            name='lat',
            field=models.DecimalField(
                decimal_places=7,
                default=3.884041,
                max_digits=10,
                verbose_name='Latitude',
            ),
        ),
        migrations.AddField(
            model_name='estate',
            name='lng',
            field=models.DecimalField(
                decimal_places=7,
                default=11.390736,
                max_digits=10,
                verbose_name='Longitude',
            ),
        ),
    ]
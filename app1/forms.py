from django import forms

class CommentForm(forms.ModelForm):
    name=forms.CharField()
    email=forms.EmailField()
    subject=forms.CharField()
    message=forms.CharField()
            
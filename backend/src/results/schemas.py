from django import forms

from .models import DisclosureLevel


class ReleaseForm(forms.Form):
    attempt_id = forms.CharField(max_length=64)
    released = forms.BooleanField(required=False)
    disclosure = forms.ChoiceField(
        choices=DisclosureLevel.choices,
        required=False,
    )
    test_id = forms.CharField(max_length=64, required=False)
    candidate_user_id = forms.IntegerField(required=False)

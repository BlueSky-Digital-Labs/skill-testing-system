from django import forms


class MCQScoreForm(forms.Form):
    attempt_id = forms.CharField(max_length=64)
    question_id = forms.CharField(max_length=64)
    question_version = forms.IntegerField(min_value=1)
    selected_option = forms.CharField(max_length=255)
    correct_option = forms.CharField(max_length=255)
    max_points = forms.DecimalField(min_value=0, max_digits=8, decimal_places=2)
    scoring_policy_id = forms.UUIDField(required=False)


class TrueFalseScoreForm(forms.Form):
    attempt_id = forms.CharField(max_length=64)
    question_id = forms.CharField(max_length=64)
    question_version = forms.IntegerField(min_value=1)
    selected_answer = forms.JSONField()
    correct_answer = forms.JSONField()
    max_points = forms.DecimalField(min_value=0, max_digits=8, decimal_places=2)
    scoring_policy_id = forms.UUIDField(required=False)

    def _clean_boolean(self, field_name):
        value = self.cleaned_data[field_name]
        if not isinstance(value, bool):
            raise forms.ValidationError('Enter a valid boolean value.')
        return value

    def clean_selected_answer(self):
        return self._clean_boolean('selected_answer')

    def clean_correct_answer(self):
        return self._clean_boolean('correct_answer')


class FIBScoreForm(forms.Form):
    attempt_id = forms.CharField(max_length=64)
    question_id = forms.CharField(max_length=64)
    question_version = forms.IntegerField(min_value=1)
    submitted_answer = forms.CharField(max_length=1024)
    accepted_answers = forms.JSONField()
    max_points = forms.DecimalField(min_value=0, max_digits=8, decimal_places=2)
    scoring_policy_id = forms.UUIDField(required=False)

    def clean_accepted_answers(self):
        accepted_answers = self.cleaned_data['accepted_answers']
        if not isinstance(accepted_answers, list) or not accepted_answers:
            raise forms.ValidationError('Provide a non-empty list of accepted answers.')
        if not all(isinstance(answer, str) for answer in accepted_answers):
            raise forms.ValidationError('Accepted answers must be strings.')
        return accepted_answers


class MultiSelectScoreForm(forms.Form):
    attempt_id = forms.CharField(max_length=64)
    question_id = forms.CharField(max_length=64)
    question_version = forms.IntegerField(min_value=1)
    selected_options = forms.JSONField()
    correct_options = forms.JSONField()
    max_points = forms.DecimalField(min_value=0, max_digits=8, decimal_places=2)
    scoring_policy_id = forms.UUIDField(required=False)

    def clean_selected_options(self):
        selected_options = self.cleaned_data['selected_options']
        if not isinstance(selected_options, list):
            raise forms.ValidationError('Selected options must be a list.')
        if not all(isinstance(option, str) for option in selected_options):
            raise forms.ValidationError('Selected options must be strings.')
        return selected_options

    def clean_correct_options(self):
        correct_options = self.cleaned_data['correct_options']
        if not isinstance(correct_options, list) or not correct_options:
            raise forms.ValidationError('Provide a non-empty list of correct options.')
        if not all(isinstance(option, str) for option in correct_options):
            raise forms.ValidationError('Correct options must be strings.')
        return correct_options


class EnqueueFreeTextForm(forms.Form):
    attempt_id = forms.CharField(max_length=64)
    test_id = forms.CharField(max_length=64)
    question_id = forms.CharField(max_length=64)
    question_version = forms.CharField(max_length=32, required=False)
    candidate_display = forms.CharField(max_length=255, required=False)
    blind_marking = forms.BooleanField(required=False)
    response_text = forms.CharField()
    max_points = forms.DecimalField(min_value=0, max_digits=8, decimal_places=2)
    topic = forms.CharField(max_length=128)


class QueueListForm(forms.Form):
    status = forms.ChoiceField(
        choices=[('queued', 'Queued'), ('graded', 'Graded')],
        required=False,
    )
    test_id = forms.CharField(max_length=64, required=False)
    attempt_id = forms.CharField(max_length=64, required=False)


class ManualGradeForm(forms.Form):
    queue_item_id = forms.UUIDField()
    awarded_points = forms.DecimalField(min_value=0, max_digits=8, decimal_places=2)
    feedback = forms.CharField(required=False)


class AggregateAttemptForm(forms.Form):
    attempt_id = forms.CharField(max_length=64)
    test_id = forms.CharField(max_length=64, required=False)


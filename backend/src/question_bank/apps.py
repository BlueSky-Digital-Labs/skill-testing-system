from django.apps import AppConfig


class QuestionBankConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "question_bank"

    def ready(self):
        import question_bank.signals  # noqa: F401

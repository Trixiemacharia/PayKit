class CoopMiddleware:
    """
    Sets Cross-Origin-Opener-Policy to allow Google OAuth popup
    to communicate back to the parent window.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        return response
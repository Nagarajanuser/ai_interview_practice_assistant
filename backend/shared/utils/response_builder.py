from typing import Any, Dict

class ResponseBuilder:
    @staticmethod
    def success(message: str = "Operation successful", data: Any = None, **kwargs) -> Dict[str, Any]:
        response = {"status": "success", "message": message}
        if data is not None:
            response["data"] = data
        response.update(kwargs)
        return response

    @staticmethod
    def error(message: str = "An error occurred", detail: Any = None) -> Dict[str, Any]:
        response = {"status": "error", "message": message}
        if detail is not None:
            response["detail"] = detail
        return response

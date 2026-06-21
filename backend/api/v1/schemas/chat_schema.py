from pydantic import BaseModel

class TopicRequest(BaseModel):
    name: str
    roles: list[str] = []

class RoleRequest(BaseModel):
    name: str
    topics: list[str] = []

class UpdateTopicRequest(BaseModel):
    old_name: str
    new_name: str
    roles: list[str] = []

class UpdateRoleRequest(BaseModel):
    old_name: str
    new_name: str
    topics: list[str] = []

class CreateSessionRequest(BaseModel):
    user_id: int
    topic: str = ""
    job_role: str = ""
    difficulty: str = ""
    limit: int | str = 5

class UpdateSessionStatusRequest(BaseModel):
    session_id: int
    status: str

class CheckProgressRequest(BaseModel):
    session_id: int
    user_id: int

class QARequest(BaseModel):
    topic: str
    job_role: str = ""
    difficulty: str = ""
    question: str
    answer: str
    answer_comment: str

class QuestionFilterRequest(BaseModel):
    topic: str | None = None
    job_role: str | None = None
    difficulty: str | None = None
    user_id: int | None = None
    limit: int | str = 5

class UpdateQARequest(BaseModel):
    q_id: int
    topic: str
    job_role: str = ""
    difficulty: str = ""
    question: str
    answer: str
    answer_comment: str

class DeleteQARequest(BaseModel):
    q_id: int

class SignupRequest(BaseModel):
    name: str
    emailid: str
    login_id: str
    password: str

class LoginRequest(BaseModel):
    emailid: str
    password: str

class PasswordResetRequest(BaseModel):
    emailid: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    user_id: int
    name: str
    emailid: str
    login_id: str
    password: str
    photo: str | None = None

class SubmitAnswerRequest(BaseModel):
    session_id: int
    user_id: int
    q_id: int
    candidate_answer: str

from pydantic import BaseModel, EmailStr, Field


class SignUpCreate(BaseModel):
    firstname: str = Field(min_length=1)
    lastname: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)


class LogInSchema(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
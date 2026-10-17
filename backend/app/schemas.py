from datetime import date, time
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from typing import Literal


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Login(Model):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class Register(Login):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^[+\d\s()-]{7,20}$")
    password: str = Field(min_length=8, max_length=128)


class Profile(Model):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^[+\d\s()-]{7,20}$")
    profile_details: str = Field(default="", max_length=2000)


class Booking(Model):
    slot_id: str = Field(min_length=1, max_length=100)
    payment_result: Literal["success", "failure"] = "success"


class Reschedule(Model):
    slot_id: str = Field(min_length=1, max_length=100)


class Slot(Model):
    appointment_date: date
    start_time: time
    end_time: time

    @field_validator("start_time", "end_time")
    @classmethod
    def minutes(cls, v):
        if v.second or v.microsecond or v.tzinfo:
            raise ValueError("Use local time in whole minutes.")
        return v


class Doctor(Model):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^[+\d\s()-]{7,20}$")
    specialization: str = Field(min_length=2, max_length=80)
    qualification: str = Field(min_length=2, max_length=150)
    experience_years: int = Field(ge=0, le=70)
    consultation_fee: float = Field(ge=0, le=100000, allow_inf_nan=False)
    biography: str = Field(min_length=10, max_length=3000)


class NewDoctor(Doctor):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class Active(Model):
    active: bool


class Password(Model):
    password: str = Field(min_length=8, max_length=128)


class Specialization(Model):
    name: str = Field(min_length=2, max_length=80)

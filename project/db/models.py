from sqlalchemy import Column, String, Float, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Offer(Base):
    __tablename__ = 'offers'
    id = Column(String, primary_key=True)
    last_refresh_time = Column(DateTime)
    title = Column(Text)
    description = Column(Text)
    url = Column(Text)
    filters = Column(JSON)
    value = Column(Float)
    previous_value = Column(Float)
    stan = Column(String) 
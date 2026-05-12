"""create sessions table

Revision ID: 001
Revises: 
Create Date: 2026-05-11 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('sessions',
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('state', sa.String(length=20), server_default='IDLE', nullable=False),
        sa.Column('conversation', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('last_transcript', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('session_id')
    )

def downgrade() -> None:
    op.drop_table('sessions')

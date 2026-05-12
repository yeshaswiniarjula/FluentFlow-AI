import logging
import sys
from app.utils.config import settings

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    
    # Avoid duplicate handlers if logger is already configured
    if not logger.handlers:
        logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
        
        handler = logging.StreamHandler(sys.stdout)
        
        # Format: timestamp | level | module | message
        formatter = logging.Formatter(
            fmt='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Prevent logs from propagating to the root logger to avoid duplicates
        logger.propagate = False
        
    return logger

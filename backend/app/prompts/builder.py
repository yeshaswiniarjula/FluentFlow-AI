from app.prompts.templates import SYSTEM_PROMPT, GRAMMAR_CORRECTION_PROMPT
from typing import List, Dict, Any

class PromptBuilder:
    def build_conversation_messages(self, conversation_history: List[Dict[str, Any]], user_message: str) -> List[Dict[str, str]]:
        messages = [{"role": "system", "content": SYSTEM_PROMPT.strip()}]
        
        recent_history = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history
        
        for msg in recent_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role and content:
                messages.append({"role": role, "content": content})
                
        messages.append({"role": "user", "content": user_message})
        
        return messages

    def build_grammar_check_messages(self, user_input: str) -> List[Dict[str, str]]:
        prompt = GRAMMAR_CORRECTION_PROMPT.format(user_input=user_input).strip()
        return [{"role": "user", "content": prompt}]

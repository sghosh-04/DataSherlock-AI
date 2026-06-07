import json
import logging
from openai import AzureOpenAI
from app.core.config import settings

logger = logging.getLogger("datasherlock")

def get_azure_openai_client():
    if settings.MOCK_AZURE or not settings.AZURE_OPENAI_API_KEY or not settings.AZURE_OPENAI_ENDPOINT:
        logger.info("Using Mock Azure OpenAI Mode.")
        return None
    try:
        client = AzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT
        )
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Azure OpenAI Client: {e}. Falling back to Mock.")
        return None

def query_llm(prompt: str, system_prompt: str = "You are a senior data architect.") -> str:
    client = get_azure_openai_client()
    if client is None:
        # Fallback will be handled at the service level using mock templates
        return ""
    
    try:
        response = client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=2000
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"Error calling Azure OpenAI: {e}")
        return ""

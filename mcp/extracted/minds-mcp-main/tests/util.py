'''
Test utilities for MCP server tests.
'''

from unittest.mock import MagicMock
from typing import Optional
from minds.minds import Mind


def create_mock_mind(
    name: str,
    model_name: str = 'gpt-4o',
    provider: str = 'openai',
    prompt_template: Optional[str] = None,
) -> Mind:
    '''
    Create a mock Mind instance with consistent properties.

    Args:
        name: The name of the Mind
        model_name: The model name (default: gpt-4o)
        provider: The provider (default: openai)
        prompt_template: Custom prompt template (default: generates one based on name)

    Returns:
        A mock Mind instance with the specified properties
    '''
    mock_mind = MagicMock(spec=Mind)
    mock_mind.name = name
    mock_mind.model_name = model_name
    mock_mind.provider = provider

    # Set parameters with prompt template
    template = prompt_template or f'Template for {name}'
    mock_mind.parameters = {'prompt_template': template}
    mock_mind.prompt_template = template

    # Add datasources attribute
    mock_mind.datasources = []

    # Add created_at and updated_at
    mock_mind.created_at = "2023-01-01"
    mock_mind.updated_at = "2023-01-02"

    # Set up the completion method
    mock_mind.completion.return_value = f'Completion response for {name}'

    return mock_mind

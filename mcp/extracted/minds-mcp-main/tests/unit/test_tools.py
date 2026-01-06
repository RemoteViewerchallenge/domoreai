'''
Unit tests for MCP server tools.
'''

import unittest
from unittest.mock import patch, MagicMock

import server
from tests.util import create_mock_mind
from minds.exceptions import ObjectNotFound


class TestCompletionTool(unittest.TestCase):
    '''Tests for the completion tool'''

    def test_completion(self) -> None:
        '''Test that the completion tool returns the expected result'''
        # Create mock mind
        mock_mind = create_mock_mind('gpt4')
        mock_mind.completion.return_value = 'Completion for test prompt'

        # Use patch as a context manager
        with patch('server.Client') as mock_client_class:
            # Configure the mock
            mock_client = MagicMock()
            mock_client.minds.get.return_value = mock_mind
            mock_client_class.return_value = mock_client

            # Call the function with API key as the last parameter
            result = server.completion('gpt4', 'test prompt', 'test_api_key')

            # Verify the result is the expected string
            self.assertEqual(result, 'Completion for test prompt')

            # Verify the client was called correctly
            mock_client_class.assert_called_once_with(
                'test_api_key', base_url='https://mdb.ai'
            )
            mock_client.minds.get.assert_called_once_with('gpt4')
            mock_mind.completion.assert_called_once_with('test prompt')

    def test_completion_mind_not_found(self) -> None:
        '''Test that the completion tool handles ObjectNotFound exceptions'''
        # Use patch as a context manager
        with patch('server.Client') as mock_client_class:
            # Configure the mock
            mock_client = MagicMock()
            mock_client.minds.get.side_effect = ObjectNotFound('Mind not found')
            mock_client_class.return_value = mock_client

            # Call the function and expect an exception
            with self.assertRaises(ObjectNotFound):
                server.completion('nonexistent_mind', 'test prompt', 'test_api_key')

            # Verify the client was called correctly
            mock_client_class.assert_called_once_with(
                'test_api_key', base_url='https://mdb.ai'
            )
            mock_client.minds.get.assert_called_once_with('nonexistent_mind')


if __name__ == '__main__':
    unittest.main()

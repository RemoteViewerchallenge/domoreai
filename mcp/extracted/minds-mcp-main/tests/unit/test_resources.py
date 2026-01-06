'''
Unit tests for MCP server resources.
'''

import unittest
from unittest.mock import patch, MagicMock

import server
from tests.util import create_mock_mind
from minds.exceptions import ObjectNotFound


class TestMindsResource(unittest.TestCase):
    '''Tests for the minds resource endpoints'''

    def test_get_minds(self) -> None:
        '''Test that the get_minds function returns the expected list of minds'''
        # Create mock minds
        mock_minds = [
            create_mock_mind('gpt4'),
            create_mock_mind(
                'claude3', model_name='claude-3-opus', provider='anthropic'
            ),
        ]

        # Use patch as a context manager
        with patch('server.Client') as mock_client_class:
            # Configure the mock
            mock_client = MagicMock()
            mock_client.minds.list.return_value = mock_minds
            mock_client_class.return_value = mock_client

            # Call the function with test API key
            result = server.get_minds('test_api_key')

            # Verify the result
            self.assertIsInstance(result, list)
            self.assertEqual(len(result), 2)
            self.assertEqual(result[0]['name'], 'gpt4')
            self.assertEqual(result[1]['name'], 'claude3')

            # Verify the client was called correctly
            mock_client_class.assert_called_once_with(
                'test_api_key', base_url='https://mdb.ai'
            )
            mock_client.minds.list.assert_called_once()

    def test_get_mind(self) -> None:
        '''Test that the get_mind resource returns the expected mind'''
        # Create mock mind
        mock_mind = create_mock_mind('gpt4')

        # Use patch as a context manager
        with patch('server.Client') as mock_client_class:
            # Configure the mock
            mock_client = MagicMock()
            mock_client.minds.get.return_value = mock_mind
            mock_client_class.return_value = mock_client

            # Call the function with parameters in the correct order
            result = server.get_mind('gpt4', 'test_api_key')

            # Verify the result
            self.assertIsInstance(result, dict)
            self.assertEqual(result['name'], 'gpt4')
            self.assertEqual(result['model_name'], 'gpt-4o')

            # Verify the client was called correctly
            mock_client_class.assert_called_once_with(
                'test_api_key', base_url='https://mdb.ai'
            )
            mock_client.minds.get.assert_called_once_with('gpt4')

    def test_get_mind_not_found(self) -> None:
        '''Test that the get_mind resource handles ObjectNotFound exceptions'''
        # Use patch as a context manager
        with patch('server.Client') as mock_client_class:
            # Configure the mock
            mock_client = MagicMock()
            mock_client.minds.get.side_effect = ObjectNotFound('Mind not found')
            mock_client_class.return_value = mock_client

            # Call the function and expect an exception
            with self.assertRaises(ObjectNotFound):
                server.get_mind('nonexistent_mind', 'test_api_key')

            # Verify the client was called correctly
            mock_client_class.assert_called_once_with(
                'test_api_key', base_url='https://mdb.ai'
            )
            mock_client.minds.get.assert_called_once_with('nonexistent_mind')


if __name__ == '__main__':
    unittest.main()

import { useNode } from '@craftjs/core';
import { Box, InputBase } from '@mui/material';

export const TilingSpreadsheet = () => {
  const { actions, props } = useNode((node) => ({ props: node.data.props }));

  return (
    <Box sx={{ p: 2, height: '100%', bgcolor: '#121212' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', color: '#444', fontSize: '10px', paddingBottom: '10px' }}>VARIABLE</th>
            <th style={{ textAlign: 'left', color: '#444', fontSize: '10px', paddingBottom: '10px' }}>VALUE</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(props).map((key) => (
            <tr key={key} style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '8px 0', color: '#888', fontSize: '12px' }}>{key}</td>
              <td>
                <InputBase
                  value={props[key]}
                  onChange={(e) => actions.setProp((p: Record<string, unknown>) => p[key] = e.target.value)}
                  sx={{ color: '#fff', fontFamily: 'monospace', fontSize: '13px', width: '100%' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
};
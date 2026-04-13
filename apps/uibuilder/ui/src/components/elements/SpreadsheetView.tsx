import { useNode } from '@craftjs/core';
import { Box, InputBase } from '@mui/material';

export const SpreadsheetView = () => {
  const { actions, props } = useNode((node) => ({
    props: node.data.props
  }));

  const handleUpdate = (key: string, value: string) => {
    actions.setProp((p: Record<string, unknown>) => {
      // Auto-cast strings to numbers if they are purely numeric
      if (value !== "" && !isNaN(Number(value))) {
        p[key] = Number(value);
      } 
      // Handle boolean strings from the input
      else if (value.toLowerCase() === 'true') p[key] = true;
      else if (value.toLowerCase() === 'false') p[key] = false;
      // Default to string (for colors/text)
      else p[key] = value;
    }, 1000); // The '1000' flag throttles the update for performance
  };

  return (
    <Box sx={{ 
      p: 1, 
      height: '100%', 
      width: '100%',
      overflowY: 'auto', 
      bgcolor: 'rgba(0,0,0,0.2)',
      '&::-webkit-scrollbar': { width: '4px' },
      '&::-webkit-scrollbar-thumb': { bgcolor: '#444' }
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #444' }}>
            <th style={{ textAlign: 'left', padding: '4px', fontSize: '10px', color: '#666' }}>VAR</th>
            <th style={{ textAlign: 'left', padding: '4px', fontSize: '10px', color: '#666' }}>VAL</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(props).map((key) => {
            // We skip internal craft props or 'isFlipped' so we don't accidentally 
            // flip the card back mid-typing
            if (key === 'children' || key === 'isFlipped') return null;

            return (
              <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ 
                  padding: '6px 4px', 
                  fontSize: '11px', 
                  color: '#888', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis' 
                }}>
                  {key}
                </td>
                <td>
                  <InputBase
                    fullWidth
                    value={props[key]}
                    onChange={(e) => handleUpdate(key, e.target.value)}
                    sx={{ 
                      color: '#fff', 
                      fontFamily: 'monospace', 
                      fontSize: '12px',
                      padding: '2px 4px',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Box>
  );
};
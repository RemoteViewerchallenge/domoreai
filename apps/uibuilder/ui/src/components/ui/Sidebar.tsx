import { useEditor } from '@craftjs/core';
import { Box, Typography, TextField } from '@mui/material';

export const Sidebar = () => {
  const { selectedId, actions, props } = useEditor((state) => {
    const [id] = state.events.selected;
    // We return an empty object if no props exist to satisfy TS
    return {
      selectedId: id,
      props: id ? state.nodes[id].data.props : {}, 
    };
  });

  if (!selectedId || !props) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="gray">Select a panel</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {Object.keys(props).map((key) => (
        <Box key={key} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>{key}</Typography>
          <TextField
            fullWidth
            size="small"
            value={props[key] || ''}
            onChange={(e) => actions.setProp(selectedId, (p: Record<string, unknown>) => p[key] = e.target.value)}
            sx={{ input: { color: '#fff', fontSize: '12px' } }}
          />
        </Box>
      ))}
    </Box>
  );
};
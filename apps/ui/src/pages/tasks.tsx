import React from 'react';
import { trpc } from '~/utils/trpc';

const TasksPage = () => {
  const { data: tasks, isLoading } = trpc.task.findMany.useQuery();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const todoTasks = tasks?.filter((task) => task.status === 'todo');
  const inProgressTasks = tasks?.filter((task) => task.status === 'in_progress');
  const doneTasks = tasks?.filter((task) => task.status === 'done');

  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
      <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem' }}>
        <h2>Todo</h2>
        {todoTasks?.map((task) => (
          <div key={task.id} style={{ border: '1px solid #eee', padding: '0.5rem', margin: '0.5rem 0' }}>
            {task.title}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem' }}>
        <h2>In Progress</h2>
        {inProgressTasks?.map((task) => (
          <div key={task.id} style={{ border: '1px solid #eee', padding: '0.5rem', margin: '0.5rem 0' }}>
            {task.title}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem' }}>
        <h2>Done</h2>
        {doneTasks?.map((task) => (
          <div key={task.id} style={{ border: '1px solid #eee', padding: '0.5rem', margin: '0.5rem 0' }}>
            {task.title}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksPage;

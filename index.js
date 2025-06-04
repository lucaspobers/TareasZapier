require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

const ASANA_TOKEN = process.env.ASANA_TOKEN;
const WORKSPACE_ID = process.env.WORKSPACE_ID;

async function obtenerProyectos() {
  const res = await axios.get('https://app.asana.com/api/1.0/projects', {
    headers: { Authorization: `Bearer ${ASANA_TOKEN}` }
  });
  return res.data.data;
}

async function obtenerTareasProyecto(projectId) {
  const res = await axios.get(
    `https://app.asana.com/api/1.0/projects/${projectId}/tasks?opt_fields=name,assignee.name,assignee.email,completed,due_on,projects.name`,
    { headers: { Authorization: `Bearer ${ASANA_TOKEN}` } }
  );
  return res.data.data.filter(task => !task.completed);
}

async function agruparTareas() {
  const proyectos = await obtenerProyectos();
  const tareasPorUsuario = {};

  for (const proyecto of proyectos) {
    const tareas = await obtenerTareasProyecto(proyecto.gid);
    for (const tarea of tareas) {
      if (!tarea.assignee) continue;

      const email = tarea.assignee.email;
      const nombre = tarea.assignee.name;

      if (!tareasPorUsuario[email]) {
        tareasPorUsuario[email] = {
          nombreResponsable: nombre,
          tareas: []
        };
      }

      tareasPorUsuario[email].tareas.push({
        nombre: tarea.name,
        fecha: tarea.due_on,
        proyecto: proyecto.name
      });
    }
  }

  return tareasPorUsuario;
}

// Endpoint para Zapier
app.get('/', async (req, res) => {
  try {
    const tareas = await agruparTareas();
    res.json({
      tareasJson: JSON.stringify(tareas)
    });
  } catch (err) {
    console.error('Error al obtener tareas:', err); // Mostrar todo el error, no solo err.message
    res.status(500).json({ error: 'Error interno al obtener tareas' });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

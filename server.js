const express = require('express');
const cors = require('cors');
const pool = require('./config/config_DB');
const app = express();
app.use(cors());

// Obtener todas las calles
app.get('/calles', async (req, res) => {
    const result = await pool.query(`
        SELECT id, ST_AsGeoJSON(geom) AS geom FROM calles;
    `);
    const geojson = {
        type: "FeatureCollection",
        features: result.rows.map(row => ({
            type: "Feature",
            geometry: JSON.parse(row.geom),
            properties: { 
                id: row.id
            }
        }))
    };
    res.json(geojson);
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));
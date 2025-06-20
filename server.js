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

app.get('/zonas', async (req, res) => {
    const result = await pool.query(`
        SELECT id, nombre, tipo, pisos, imagen, ST_AsGeoJSON(geom) AS geom FROM zonas;
    `);
    const geojson = {
        type: "FeatureCollection",
        features: result.rows.map(row => ({
            type: "Feature",
            geometry: JSON.parse(row.geom),
            properties: { 
                id: row.id, 
                nombre: row.nombre,
                tipo: row.tipo,
                pisos: row.pisos, 
                imagen: row.imagen, 
            }
        }))
    };
    res.json(geojson);
});

// app.get('/ruta-personalizada', async (req, res) => {
//     try {
//         const { lon_origen, lat_origen, lon_destino, lat_destino } = req.query;
//         if (!lon_origen || !lat_origen || !lon_destino || !lat_destino) {
//             return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
//         }
//         const lonOri = parseFloat(lon_origen);
//         const latOri = parseFloat(lat_origen);
//         const lonDest = parseFloat(lon_destino);
//         const latDest = parseFloat(lat_destino);

//         const query = `
//             SELECT r.seq_out, r.node_out, r.edge_out, r.cost_out, r.agg_cost_out, ST_AsGeoJSON(r.snap_origen) as snap_origen, ST_AsGeoJSON(r.snap_destino) as snap_destino,
//                 ST_AsGeoJSON(r.geom_out) AS geom, r.frac_origen_out, r.frac_destino_out
//             FROM calcular_ruta_entre_puntos($1, $2, $3, $4) r
            
//         `;

//         const { rows } = await pool.query(query, [lonOri, latOri, lonDest, latDest]);

//         const geojson = {
//             type: "FeatureCollection",
//             features: rows.map(row => ({
//                 type: "Feature",
//                 geometry: JSON.parse(row.geom),
//                 properties: {
//                     seq: row.seq_out,
//                     node: row.node_out,
//                     edge: row.edge_out,
//                     snap_origen: JSON.parse(row.snap_origen),
//                     snap_destino: JSON.parse(row.snap_destino),
//                     franc_origen: row.frac_origen_out,
//                     franc_destino: row.frac_destino_out,
//                 }
//             }))
//         };

//         res.json(geojson);

//     } catch (error) {
//         console.error("Error en /ruta-personalizada:", error);
//         res.status(500).json({ error: "Error al calcular la ruta", detalle: error.message });
//     }
// });

app.get('/ruta-personalizada', async (req, res) => {
    const { lon_origen, lat_origen, lon_destino, lat_destino } = req.query;
    try {
        if (!lon_origen || !lat_origen || !lon_destino || !lat_destino) {
            return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
        }
        // const lonOri = parseFloat(lon_origen);
        // const latOri = parseFloat(lat_origen);
        // const lonDest = parseFloat(lon_destino);
        // const latDest = parseFloat(lat_destino);

        const query = `
            SELECT seq_out AS seq, node_out AS node, edge_out AS edge, cost_out AS cost, ST_AsGeoJSON(geom_out) AS geom
            FROM calcular_ruta_entre_puntos_custom($1, $2, $3, $4);
        `;

        const { rows } = await pool.query(query, [lon_origen, lat_origen, lon_destino, lat_destino]);

        const geojson = {
            type: "FeatureCollection",
            features: rows.map(row => ({
                type: "Feature",
                geometry: JSON.parse(row.geom),
                properties: {
                    seq: row.seq,
                    node: row.node,
                    edge: row.edge
                }
            }))
        };

        res.json(geojson);

    } catch (error) {
        console.error("Error en /ruta-personalizada:", error);
        res.status(500).json({ error: "Error al calcular la ruta", detalle: error.message });
    }
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const dbFile = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite com sucesso.');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        perfil TEXT NOT NULL,
        nome_lavajato TEXT DEFAULT 'GestarCar Lavajato',
        logo_url TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS gestarcar_os (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_nome TEXT NOT NULL,
        cliente_fone TEXT,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        placa TEXT,
        servico TEXT NOT NULL,
        valor REAL NOT NULL,
        operador TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.get(`SELECT COUNT(*) as count FROM usuarios`, (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO usuarios (usuario, senha, perfil, nome_lavajato) VALUES ('admin', '1234', 'admin', 'CarWash VIP')`);
            db.run(`INSERT INTO usuarios (usuario, senha, perfil, nome_lavajato) VALUES ('operador', '1234', 'operador', 'CarWash VIP')`);
            console.log('Utilizadores padrão criados.');
        }
    });
});

app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;
    db.get(`SELECT * FROM usuarios WHERE usuario = ? AND senha = ?`, [usuario, senha], (err, row) => {
        if (err || !row) {
            return res.status(401).json({ error: 'Utilizador ou senha incorretos.' });
        }
        res.json({ 
            success: true, 
            perfil: row.perfil, 
            usuario: row.usuario, 
            nome_lavajato: row.nome_lavajato,
            logo_url: row.logo_url 
        });
    });
});

app.post('/api/configuracoes', (req, res) => {
    const { usuario, nome_lavajato, logo_url } = req.body;
    db.run(`UPDATE usuarios SET nome_lavajato = ?, logo_url = ? WHERE usuario = ?`, [nome_lavajato, logo_url, usuario], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Configurações atualizadas com sucesso!' });
    });
});

app.get('/api/configuracoes/:usuario', (req, res) => {
    db.get(`SELECT nome_lavajato, logo_url FROM usuarios WHERE usuario = ?`, [req.params.usuario], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Configuração não encontrada.' });
        }
        res.json(row);
    });
});

app.post('/api/os', (req, res) => {
    const { cliente_nome, cliente_fone, marca, modelo, placa, servico, valor, operador } = req.body;
    
    if (!cliente_nome || !marca || !modelo || !servico || valor === undefined) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    const query = `INSERT INTO gestarcar_os (cliente_nome, cliente_fone, marca, modelo, placa, servico, valor, operador) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [cliente_nome, cliente_fone, marca, modelo, placa, servico, valor, operador || 'Geral'], function(err) {
        if (err) {
            console.error('Erro ao inserir OS:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Ordem de serviço criada com sucesso!' });
    });
});

app.get('/api/os', (req, res) => {
    db.all(`SELECT * FROM gestarcar_os ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/relatorio/:tipo', (req, res) => {
    const tipo = req.params.tipo;
    let filtroSQL = `DATE(data_criacao) = DATE('now', 'localtime')`;

    if (tipo === 'semanal') {
        filtroSQL = `data_criacao >= datetime('now', '-7 days', 'localtime')`;
    } else if (tipo === 'mensal') {
        filtroSQL = `data_criacao >= datetime('now', '-30 days', 'localtime')`;
    }

    const queryResumo = `SELECT COUNT(*) as total_atendimentos, SUM(valor) as faturamento_total FROM gestarcar_os WHERE ${filtroSQL}`;
    
    db.get(queryResumo, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(`SELECT id, cliente_nome, marca, modelo, placa, servico, valor FROM gestarcar_os WHERE ${filtroSQL} ORDER BY id DESC`, [], (err, items) => {
            res.json({
                resumo: row || { total_atendimentos: 0, faturamento_total: 0 },
                itens: items || []
            });
        });
    });
});

app.get('/api/os/:id', (req, res) => {
    db.get(`SELECT * FROM gestarcar_os WHERE id = ?`, [req.params.id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }
        res.json(row);
    });
});

app.listen(PORT, () => {
    console.log(`GestarCar servidor a correr na porta ${PORT}`);
});
let logoBase64 = '';
let nomeLavajatoAtual = 'GestarCar';

const usuarioLogado = localStorage.getItem('gestarcar_user');
const perfilLogado = localStorage.getItem('gestarcar_perfil');

if (!usuarioLogado) {
    window.location.href = 'login.html';
} else {
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = `${usuarioLogado} (${perfilLogado})`;
    
    if (perfilLogado === 'admin') {
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) adminPanel.style.display = 'block';
    }
    carregarConfiguracoesLavajato();
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

async function carregarConfiguracoesLavajato() {
    try {
        const res = await fetch(`/api/configuracoes/${usuarioLogado}`);
        const data = await res.json();
        if (res.ok) {
            nomeLavajatoAtual = data.nome_lavajato || 'Lavajato';
            logoBase64 = data.logo_url || '';
            const tituloTopo = document.getElementById('tituloTopo');
            if (tituloTopo) tituloTopo.textContent = `🚗 ${nomeLavajatoAtual}`;
        }
    } catch (err) {
        console.error('Erro ao carregar configurações');
    }
}

// Envio da OS
const osForm = document.getElementById('osForm');
if (osForm) {
    osForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const checkboxes = document.querySelectorAll('input[name="servicoCheckbox"]:checked');
        let servicosSelecionados = Array.from(checkboxes).map(cb => cb.value);

        const servicoExtra = document.getElementById('servicoPersonalizado').value.trim();
        if (servicoExtra) {
            servicosSelecionados.push(servicoExtra);
        }

        if (servicosSelecionados.length === 0) {
            alert('Por favor, selecione pelo menos um serviço ou digite um serviço personalizado.');
            return;
        }

        const servicoFinal = servicosSelecionados.join(' + ');

        const dadosOS = {
            cliente_nome: document.getElementById('cliente_nome').value,
            cliente_fone: document.getElementById('cliente_fone').value,
            marca: document.getElementById('marca').value,
            modelo: document.getElementById('modelo').value,
            placa: document.getElementById('placa').value.toUpperCase(),
            servico: servicoFinal,
            valor: parseFloat(document.getElementById('valor').value),
            operador: usuarioLogado
        };

        try {
            const res = await fetch('/api/os', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosOS)
            });
            
            const resultado = await res.json();
            
            if (res.ok && resultado.id) {
                alert('Ordem de serviço gerada com sucesso!');
                osForm.reset();
                carregarListaOS();
                
                setTimeout(() => {
                    abrirRecibo(resultado.id);
                }, 300);
            } else {
                alert('Erro: ' + (resultado.error || 'Não foi possível gravar a OS.'));
            }
        } catch (err) {
            alert('Erro de conexão com o servidor ao gerar a OS.');
        }
    });
}

async function carregarListaOS() {
    try {
        const res = await fetch('/api/os');
        const lista = await res.json();
        const tbody = document.getElementById('listaOS');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        lista.forEach(os => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${os.id}</td>
                <td><strong>${os.cliente_nome}</strong><br><small>${os.marca} ${os.modelo} (${os.placa || 'N/A'})</small></td>
                <td>${os.servico}</td>
                <td>R$ ${os.valor.toFixed(2)}</td>
                <td><button class="btn-recibo" onclick="abrirRecibo(${os.id})">Recibo</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erro ao carregar lista de OS');
    }
}

async function abrirRecibo(id) {
    try {
        const res = await fetch(`/api/os/${id}`);
        const os = await res.json();
        if (res.ok) {
            document.getElementById('reciboConteudo').innerHTML = `
                <div class="recibo-timbrado">
                    <div class="recibo-header">
                        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="max-height: 50px; margin-bottom: 5px;"><br>` : ''}
                        <h2>${nomeLavajatoAtual}</h2>
                        <p>Recibo de Serviço Automotivo</p>
                    </div>
                    <div class="recibo-body">
                        <div class="info-group"><span>O.S:</span><span>#${os.id}</span></div>
                        <div class="info-group"><span>Data:</span><span>${new Date(os.data_criacao).toLocaleString('pt-BR')}</span></div>
                        <div class="info-group"><span>Cliente:</span><span>${os.cliente_nome}</span></div>
                        ${os.cliente_fone ? `<div class="info-group"><span>Telefone:</span><span>${os.cliente_fone}</span></div>` : ''}
                        <div class="info-group"><span>Veículo:</span><span>${os.marca} ${os.modelo}</span></div>
                        <div class="info-group"><span>Placa:</span><span><strong>${os.placa || 'N/A'}</strong></span></div>
                        <div class="info-group"><span>Serviço:</span><span><strong>${os.servico}</strong></span></div>
                        <div class="info-group" style="color:#28a745; font-size:1.1rem; border-bottom:2px solid #007bff; padding-bottom:8px;">
                            <span>Total:</span><span><strong>R$ ${os.valor.toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('modalRecibo').style.display = 'flex';
        }
    } catch (err) {
        alert('Erro ao gerar recibo.');
    }
}

async function abrirRelatorio(tipo) {
    try {
        const res = await fetch(`/api/relatorio/${tipo}`);
        const data = await res.json();
        let htmlItens = '';
        
        if (data.itens.length === 0) {
            htmlItens = `<tr><td colspan="4" style="text-align: center; color: #777;">Nenhum atendimento registado.</td></tr>`;
        } else {
            data.itens.forEach(item => {
                htmlItens += `
                    <tr>
                        <td>#${item.id}</td>
                        <td><strong>${item.cliente_nome}</strong><br><small>${item.marca} ${item.modelo} - Placa: ${item.placa || 'N/A'}</small></td>
                        <td><span style="color: #0056b3; font-weight: 500;">${item.servico}</span></td>
                        <td><strong>R$ ${item.valor.toFixed(2)}</strong></td>
                    </tr>
                `;
            });
        }

        const titulos = { diario: 'Caixa Diário', semanal: 'Relatório Semanal (7 dias)', mensal: 'Relatório Mensal (30 dias)' };

        document.getElementById('relatorioConteudo').innerHTML = `
            <div class="relatorio-impressao">
                <div class="recibo-header" style="text-align: center; margin-bottom: 15px;">
                    <h2>🚗 ${nomeLavajatoAtual}</h2>
                    <p><strong>${titulos[tipo]}</strong></p>
                    <p style="font-size: 0.8rem; color: #666;">Emitido em: ${new Date().toLocaleString('pt-BR')}</p>
                </div>
                
                <div style="background: #e9ecef; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 0.95rem;">
                    <p style="margin-bottom: 5px;"><strong>Total de Atendimentos:</strong> ${data.resumo.total_atendimentos || 0}</p>
                    <p><strong>Faturamento Total:</strong> R$ ${(data.resumo.faturamento_total || 0).toFixed(2)}</p>
                </div>

                <h4>Histórico de Serviços Realizados:</h4>
                <div style="width: 100%; margin-top: 8px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 8px; text-align: left;">ID</th>
                                <th style="padding: 8px; text-align: left;">Cliente / Veículo</th>
                                <th style="padding: 8px; text-align: left;">Serviço(s) Realizado(s)</th>
                                <th style="padding: 8px; text-align: left;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>${htmlItens}</tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('modalRelatorio').style.display = 'flex';
    } catch (err) {
        alert('Erro ao carregar relatório.');
    }
}

function abrirModalConfig() {
    const inputNome = document.getElementById('inputNomeLavajato');
    if (inputNome) inputNome.value = nomeLavajatoAtual;
    document.getElementById('modalConfig').style.display = 'flex';
}

const configForm = document.getElementById('configForm');
if (configForm) {
    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoNome = document.getElementById('inputNomeLavajato').value;
        const fileInput = document.getElementById('inputLogoFile');

        let novaLogo = logoBase64;
        if (fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = async function(event) {
                novaLogo = event.target.result;
                await salvarConfigServer(novoNome, novaLogo);
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            await salvarConfigServer(novoNome, novaLogo);
        }
    });
}

async function salvarConfigServer(nome, logo) {
    try {
        const res = await fetch('/api/configuracoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: usuarioLogado, nome_lavajato: nome, logo_url: logo })
        });
        if (res.ok) {
            alert('Configurações salvas com sucesso!');
            location.reload();
        } else {
            alert('Erro ao salvar configurações.');
        }
    } catch (err) {
        alert('Erro de conexão ao salvar.');
    }
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

carregarListaOS();
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../hooks/useApi';
import { StatCard, QACard, WelcomeBanner } from '../../../components/ui';

export default function ProfHome({ onNavigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ disc:0, trilhas:0, questoes:0, turmas:0, alunos:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/disciplinas?professor_id='+user.id),
      api.get('/trilhas?professor_id='+user.id),
      api.get('/questoes?professor_id='+user.id),
      api.get('/turmas?professor_id='+user.id),
    ]).then(([dRes, tRes, qRes, tuRes]) => {
      const turmas = tuRes.data.turmas || [];
      const totalAlunos = turmas.reduce((s, t) => s + (t.total_alunos || 0), 0);
      setStats({ disc:dRes.data.disciplinas?.length||0, trilhas:tRes.data.trilhas?.length||0, questoes:qRes.data.questoes?.length||0, turmas:turmas.length, alunos:totalAlunos });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Navigate to section AND signal it to open its create modal
  const nav = (section, action) => {
    onNavigate?.(section, action);
  };

  // Use first real name word, skip titles like 'Prof.', 'Dr.', etc.
  const TITULOS = ['prof.','dr.','dra.','ms.','me.','esp.'];
  const partes = user.nome.split(' ');
  const firstName = partes.find(p => !TITULOS.includes(p.toLowerCase().replace(',',''))) || partes[0];

  return (
    <>
      <WelcomeBanner
        greeting={'Olá, '+firstName+'! 👩‍🏫'}
        sub={'Você tem '+stats.turmas+' turma(s) ativa(s) e '+stats.alunos+' aluno(s) matriculados.'}
        emoji="🧑‍🏫"
      />

      <div className="stats-grid">
        <StatCard label="Disciplinas" value={loading?'..':stats.disc}     icon="📚" accent="accent-sky" />
        <StatCard label="Trilhas"     value={loading?'..':stats.trilhas}  icon="🗺️" accent="accent-green" />
        <StatCard label="Questões"    value={loading?'..':stats.questoes} icon="❓" accent="accent-amber" />
        <StatCard label="Alunos"      value={loading?'..':stats.alunos}   icon="👨‍🎓" accent="accent-coral" />
      </div>

      <div className="quick-actions">
        <QACard icon="📚" title="Nova Disciplina"     desc="Criar e configurar"    onClick={() => nav('disciplinas', 'criar')} />
        <QACard icon="🗺️" title="Nova Trilha"         desc="Desafios gamificados"  onClick={() => nav('trilhas', 'criar')} />
        <QACard icon="❓" title="Criar Questão c/ IA" desc="Geração com RAG + TRI" onClick={() => nav('questoes', 'criar')} />
        <QACard icon="📝" title="Nova Avaliação"      desc="Provas e atividades"   onClick={() => nav('avaliacoes', 'criar')} />
        <QACard icon="📋" title="Nova Atividade"      desc="Envio de arquivo"      onClick={() => nav('atividades', 'criar')} />
        <QACard icon="🏫" title="Nova Turma"          desc="Matricular alunos"     onClick={() => nav('turmas', 'criar')} />
        <QACard icon="📌" title="Publicar Aviso"      desc="Mural de turma"        onClick={() => nav('mural', 'criar')} />
      </div>
    </>
  );
}

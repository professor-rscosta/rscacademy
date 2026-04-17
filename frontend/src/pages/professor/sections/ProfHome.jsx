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
        sub={(function(){
          var t = stats.turmas, a = stats.alunos;
          if (t === 0 && a === 0) return 'Você não possui turmas ativas nem alunos matriculados.';
          var turmaTexto = t === 1 ? 'turma ativa' : 'turmas ativas';
          var alunoTexto = a === 1 ? 'aluno matriculado' : 'alunos matriculados';
          return 'Você possui ' + t + ' ' + turmaTexto + ' e ' + a + ' ' + alunoTexto + '.';
        })()}
        emoji="🧑‍🏫"
      />

      <div className="stats-grid">
        <StatCard label="Disciplinas" value={loading?'..':stats.disc}     icon="📚" accent="accent-sky" />
        <StatCard label="Trilhas de Aprendizagem"     value={loading?'..':stats.trilhas}  icon="🗺️" accent="accent-green" />
        <StatCard label="Banco de Questões"    value={loading?'..':stats.questoes} icon="❓" accent="accent-amber" />
        <StatCard label="Alunos Matriculados"      value={loading?'..':stats.alunos}   icon="👨‍🎓" accent="accent-coral" />
      </div>

      <div className="quick-actions">
        <QACard icon="📚" title="Nova Disciplina"     desc="Criar e configurar disciplina"    onClick={() => nav('disciplinas', 'criar')} />
        <QACard icon="🗺️" title="Nova Trilha"         desc="Trilha de aprendizagem gamificada"  onClick={() => nav('trilhas', 'criar')} />
        <QACard icon="❓" title="Criar Questão c/ IA" desc="Gerar questão com IA (RAG + TRI)" onClick={() => nav('questoes', 'criar')} />
        <QACard icon="📝" title="Nova Avaliação"      desc="Criar avaliação (provas e atividades)"   onClick={() => nav('avaliacoes', 'criar')} />
        <QACard icon="📋" title="Nova Atividade"      desc="Enviar atividade (upload de arquivo)"      onClick={() => nav('atividades', 'criar')} />
        <QACard icon="🏫" title="Nova Turma"          desc="Criar turma e matricular alunos"     onClick={() => nav('turmas', 'criar')} />
        <QACard icon="📌" title="Publicar Aviso"      desc="Publicar aviso no mural da turma"        onClick={() => nav('mural', 'criar')} />
      </div>
    </>
  );
}

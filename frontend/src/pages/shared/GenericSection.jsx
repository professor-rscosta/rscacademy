import { EmptyState } from '../../components/ui';

export default function GenericSection({ title, sub, icon }) {
  return (
    <>
      <div className="page-header">
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
      <div className="card">
        <EmptyState
          icon={icon}
          title="Módulo em desenvolvimento"
          sub="Este módulo será implementado nas próximas etapas do projeto."
        />
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 8,
            fontSize: 13, color: 'var(--slate-500)',
          }}>
            <span>🚀</span>
            Etapa 2: Disciplinas, Turmas, Questões com IA, Avaliações, Relatórios avançados
          </div>
        </div>
      </div>
    </>
  );
}

require('dotenv').config();
const express=require('express'),cors=require('cors'),helmet=require('helmet'),morgan=require('morgan'),rateLimit=require('express-rate-limit');
const {initDatabase}=require('./database/init');
const app=express(),PORT=process.env.PORT||3001;

app.use(helmet());
app.use(cors({origin:process.env.FRONTEND_URL||'http://localhost:5173',credentials:true}));
app.use(rateLimit({windowMs:15*60*1000,max:500,message:{error:'Rate limit exceeded.'}}));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
if(process.env.NODE_ENV==='development') app.use(morgan('dev'));

app.use('/api/auth',         require('./routes/auth.routes'));
app.use('/api/users',        require('./routes/user.routes'));
app.use('/api/disciplinas',  require('./routes/disciplina.routes'));
app.use('/api/trilhas',      require('./routes/trilha.routes'));
app.use('/api/questoes',     require('./routes/questao.routes'));
app.use('/api/respostas',    require('./routes/resposta.routes'));
app.use('/api/turmas',       require('./routes/turma.routes'));
app.use('/api/materiais',    require('./routes/material.routes'));
app.use('/api/avisos',       require('./routes/aviso.routes'));
app.use('/api/relatorios',   require('./routes/relatorio.routes'));
app.use('/api/avaliacoes',   require('./routes/avaliacao.routes'));
app.use('/api/gamificacao',  require('./routes/gamificacao.routes'));
app.use('/api/chatbot',      require('./routes/chatbot.routes'));
app.use('/api/atividades',   require('./routes/atividade.routes'));
app.use('/api/rag',          require('./routes/rag.routes'));
app.use('/api/boletim',     require('./routes/boletim.routes'));
app.get('/api/health', (req,res)=>res.json({status:'ok',time:new Date()}));

app.use((req,res)=>res.status(404).json({error:'Rota não encontrada.'}));
app.use((err,req,res,next)=>{console.error(err.stack);res.status(err.status||500).json({error:err.message||'Erro interno.'});});

async function start(){
  await initDatabase();
  app.listen(PORT,()=>{
    console.log(`🚀 RSC Academy Backend → http://localhost:${PORT}`);
    if(!process.env.OPENAI_API_KEY||process.env.OPENAI_API_KEY==='sua_chave_aqui')
      console.warn('⚠️  OPENAI_API_KEY não configurada.');
    else console.log('✅ OpenAI API conectada → gpt-4o-mini');
  });
}
start().catch(err=>{console.error(err);process.exit(1);});

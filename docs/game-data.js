export const players = [
  [1, 'Ana', 'Mago', 'Campina Grande'],
  [2, 'Bruno', 'Tank', 'João Pessoa'],
  [3, 'Carla', 'Arqueira', 'Campina Grande'],
  [4, 'Diego', 'Mago', 'Patos'],
  [5, 'Elisa', 'Tank', 'Campina Grande'],
  [6, 'Felipe', 'Arqueiro', 'Sousa'],
  [7, 'Gabriela', 'Mago', 'João Pessoa'],
  [8, 'Hugo', 'Tank', 'Campina Grande'],
];

export const matches = [
  [201, 1, 'Arena', 420], [202, 3, 'Ruínas', 190],
  [203, 1, 'Ruínas', 850], [204, 2, 'Arena', 75],
  [205, 5, 'Vulcão', 1250], [206, 2, 'Ruínas', 320],
  [207, 7, 'Vulcão', 560], [208, 3, 'Arena', 210],
  [209, 6, 'Arena', 99], [210, 1, 'Vulcão', 45],
];

export const phases = [
  {
    title: 'Aquecimento', objective: 'Encontre os jogadores desta cidade e apresente os nomes na ordem mostrada.',
    columns: ['nome', 'classe'], rows: [['Ana', 'Mago'], ['Carla', 'Arqueira'], ['Elisa', 'Tank'], ['Hugo', 'Tank']],
    hints: ['Todos os jogadores da saída têm algo em comum na cidade.', 'Observe também a ordem alfabética dos nomes.'],
  },
  {
    title: 'Faixa de pontuação', objective: 'Encontre as partidas dentro da faixa indicada pelos pontos.',
    columns: ['id', 'pontos'], rows: [[202, 190], [208, 210], [206, 320], [201, 420]],
    hints: ['Observe o menor e o maior valor aceitos.', 'Você precisa filtrar uma faixa e depois ordenar.'],
  },
  {
    title: 'Classes permitidas', objective: 'Mostre os jogadores das classes presentes no resultado.',
    columns: ['nome', 'classe'], rows: [['Ana', 'Mago'], ['Bruno', 'Tank'], ['Diego', 'Mago'], ['Elisa', 'Tank'], ['Gabriela', 'Mago'], ['Hugo', 'Tank']],
    hints: ['Somente duas classes aparecem.', 'Pense em selecionar linhas cujo valor pertence a um pequeno conjunto.'],
  },
  {
    title: 'Duas condições', objective: 'Combine os critérios necessários para obter esses jogadores.',
    columns: ['nome', 'classe', 'cidade'], rows: [['Ana', 'Mago', 'Campina Grande'], ['Elisa', 'Tank', 'Campina Grande'], ['Hugo', 'Tank', 'Campina Grande']],
    hints: ['A cidade precisa ser verdadeira junto com outra condição.', 'Dentro da segunda condição, duas classes diferentes são aceitas.'],
  },
  {
    title: 'Top da Arena', objective: 'Mostre somente as duas partidas do topo deste mapa.',
    columns: ['id', 'mapa', 'pontos'], rows: [[201, 'Arena', 420], [208, 'Arena', 210]],
    hints: ['O nome do mapa começa com uma letra específica.', 'Depois de ordenar pelos maiores pontos, mantenha apenas duas linhas.'],
  },
  {
    title: 'Dados em duas tabelas', objective: 'Associe jogadores e partidas para encontrar estas pontuações.',
    columns: ['nome', 'mapa', 'pontos'], rows: [['Elisa', 'Vulcão', 1250], ['Ana', 'Ruínas', 850], ['Gabriela', 'Vulcão', 560], ['Ana', 'Arena', 420], ['Bruno', 'Ruínas', 320]],
    hints: ['O nome está em uma tabela; mapa e pontos estão em outra.', 'Relacione jogadores.id com partidas.jogador_id.'],
  },
  {
    title: 'Painel geral', objective: 'Resuma todas as partidas em uma linha.',
    columns: ['total_partidas', 'total_pontos', 'media_pontos', 'menor_pontuacao', 'maior_pontuacao'], rows: [[10, 4019, 401.9, 45, 1250]],
    hints: ['A saída resume todas as partidas em uma única linha.', 'Você precisa calcular quantidade, soma, média, menor valor e maior valor.'],
  },
  {
    title: 'Primeiro filtre, depois agrupe', objective: 'Primeiro algumas linhas são retiradas. Depois as linhas restantes são agrupadas. Considere somente partidas com mais de 100 pontos.',
    columns: ['mapa', 'partidas', 'total_pontos'], rows: [['Vulcão', 2, 1810], ['Ruínas', 3, 1360], ['Arena', 2, 630]],
    hints: ['Nem todas as partidas devem participar do agrupamento.', 'O filtro das linhas acontece antes de formar os grupos.'],
  },
  {
    title: 'Agora filtre os grupos', objective: 'Considere todas as partidas e mostre apenas jogadores com pelo menos duas partidas.',
    columns: ['nome', 'partidas', 'total_pontos'], rows: [['Ana', 3, 1315], ['Carla', 2, 400], ['Bruno', 2, 395]],
    hints: ['Primeiro forme um grupo para cada jogador.', 'A condição depende do resultado do COUNT, portanto ela é aplicada depois que os grupos existem.'],
  },
  {
    title: 'Os que desapareceram', objective: 'Encontre os jogadores sem partidas e mostre sua pontuação ausente.',
    columns: ['nome', 'pontos'], rows: [['Diego', null], ['Hugo', null]],
    hints: ['Esses jogadores não encontraram nenhuma linha correspondente em partidas.', 'Preserve todos os jogadores e procure onde a correspondência ficou ausente.'],
  },
];

export const boss = {
  title: 'Consulta completa',
  objective: 'Analise jogadores de Campina Grande. Considere somente partidas com mais de 100 pontos; mostre quem acumulou mais de 500 pontos, na ordem do maior total.',
  columns: ['nome', 'partidas', 'total_pontos'], rows: [['Ana', 2, 1270], ['Elisa', 1, 1250]],
  hints: [
    'O nome está em jogadores; os pontos estão em partidas. Comece pensando em como relacionar as duas tabelas.',
    'Antes de agrupar, nem todas as linhas devem participar: observe cidade e pontuação.',
    'Depois de agrupar, ainda é preciso eliminar grupos cujo total não ultrapassa 500 pontos.',
  ],
};

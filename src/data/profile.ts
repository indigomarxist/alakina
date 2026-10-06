// Site-wide profile details. The phone number is intentionally omitted.
export const profile = {
  name: 'Alakina Lee',
  tagline: 'Model · Actor · Singer',
  based: 'New York City',
  email: 'alakina421@icloud.com',
  instagram: 'alakina.lee',
  bio: [
    "Alakina is a performer who loves musical theater, acting, singing and modeling. Storytelling is at the heart of her work, and she loves bringing characters to life while connecting with an audience.",
    "Trained at the American Musical and Dramatic Academy in New York, she has performed on stage, worked in runway, editorial and commercial modeling, and appeared in film. She is building a career across theater, film, television and fashion, and is always looking for new collaborators.",
  ],
  stats: [
    ['Height', `5′7″`],
    ['Bust', '33″'],
    ['Waist', '25″'],
    ['Hips', '33″'],
    ['Shoe', '7.5 US'],
    ['Hair', 'Brown'],
    ['Eyes', 'Hazel'],
    ['Voice', 'Mezzo-Soprano'],
  ] as const,
  skills: [
    'Stylized singing (mezzo-soprano)',
    'Scene study',
    'Character development',
    'Jazz and musical theater dance',
    'Guitar',
  ],
  training: {
    school: 'American Musical and Dramatic Academy, NYC',
    program: 'Musical Theatre Conservatory',
    years: '2024–2026',
  },
  files: {
    compCard: '/files/alakina-lee-comp-card.pdf',
    resume: '/files/alakina-lee-resume.pdf',
  },
};

import { Trait } from './types';

export const APP_CONTENT = {
  title: "Assessing Potential",
  introText: [
    "This tool is designed to help you gain greater insights into your team's potential and inform your assessment of their capacity to take on more senior, complex roles.",
    "This tool has been developed in consideration of the critical traits and behaviors that we see to be most predictive of someone's ability to succeed in progressively more senior roles. This does not replace the Leadership Standard and Dial-up Behaviours.",
    "Consistent performance over time is an important qualifier to progress to a conversation around future career and potential. Where there are performance concerns over a sustained period, focus energy on raising performance, rather than assessing potential.",
    "How to use the tool: Please read each descriptor and prompt in turn and reflect on how consistently you see this employee demonstrating the behavioural indicators. Try to use the full scale when rating an individual."
  ]
};

export const RESULTS_CONTENT = {
  sidebarTitle: "Guidance",
  sidebarText: [
    "Our Leadership Standard and our Dial-Up Behaviours remain at the core of Performance and Development conversations, and you'll see many of the potential traits and behaviours referenced within these. Please continue to use the Leadership Standard and Dial-Up Behaviours, plus any additional insights from the Potential Indicator Tool to support meaningful feedback and development conversations with your team.",
    "To enable our colleagues to experience inspiring and transparent conversations about their career and how they can grow at the organization, we expect all line managers to have feedback and development conversations with their team following Talent Reviews.",
    "The feedback conversation is intended to be an inspiring and honest conversation about growth and future career. People are curious to know their Talent Judgement. Be honest and tell your team where there is an aligned view on their potential for more senior roles and where you don't see this potential, be clear on the behaviours they need to demonstrate more or less of to have confidence in their potential for more senior roles."
  ]
};

export const VERDICT_RANGES = [
  {
    min: 39,
    max: 48,
    label: "39 - 48",
    title: "High Potential",
    description: "An individual with a total score ranging from **39 – 48** is likely to **adapt quickly to changing, new and more complex situations** in progressively more senior roles. They are likely to progress into **significantly more senior roles, possibly two levels above current level**."
  },
  {
    min: 28,
    max: 38,
    label: "28 - 38",
    title: "Growth Potential",
    description: "An individual with a total score ranging **28 – 38** is likely to **adapt well to the challenges of more senior and complex roles**, with **the right coaching support and leadership experiences**. They are likely to progress into **more senior roles, possibly one level above current level**."
  },
  {
    min: 12,
    max: 27,
    label: "12 - 27",
    title: "Well Placed",
    description: "An individual with a total score ranging **12 – 27** will need to **demonstrate more of the critical traits consistently before they can progress** into more senior roles. They are more likely to progress into **bigger roles at same level**. With **solid leadership experiences and excellent track record of performance**, they could advance into **more senior roles within 'familiar' functional area**."
  }
];

export const getVerdict = (score: number) => {
  // Default to lowest range if something goes wrong, but logic should hold
  return VERDICT_RANGES.find(r => score >= r.min && score <= r.max) || VERDICT_RANGES[2];
};

// NOTE: To enable Google Sheets integration, you must create a project in Google Cloud Console
// and replace these values with your own Client ID and API Key.
export const GOOGLE_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || 'YOUR_API_KEY_HERE',
  DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4', 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
  SPREADSHEET_NAME: 'Organization Potential Assessments Log'
};

export const TRAITS: Trait[] = [
  // Intellectual Qualities
  {
    id: 'curious',
    category: 'INTELLECTUAL QUALITIES',
    name: 'CURIOUS',
    description: 'Understands the big picture, brings outside-in thinking and sees issues from a variety of perspectives.',
    indicators: [
      'Inquisitive about trends, new thinking and passionate about learning new things.',
      'Investigates solutions, challenges the status-quo and explores issues from multiple, broad angles.'
    ],
    prompt: 'Do they bring and leverage external perspectives and data, pre-empting emerging trends and viewing ideas from multiple lenses?'
  },
  {
    id: 'flexible',
    category: 'INTELLECTUAL QUALITIES',
    name: 'FLEXIBLE',
    description: 'Quick to adapt their approach as the broader context around them changes.',
    indicators: [
      'Is quick to notice when priorities and needs have shifted and quickly adapts plans.',
      'Inclusive of others\' relevant ideas and prepared to change their point of view where needed.'
    ],
    prompt: 'Can you think of a time when they\'ve demonstrated agility, pivoting in response to changes?'
  },
  {
    id: 'resourceful',
    category: 'INTELLECTUAL QUALITIES',
    name: 'RESOURCEFUL',
    description: 'Finds creative solutions to problems and challenges, often while working within constraints.',
    indicators: [
      'Anticipates and establishes issues and opportunities quickly.',
      'Works comfortably with limited insight and resources.',
      'Is creative in their approach.'
    ],
    prompt: 'Do they find creative solutions to problems, even when challenged with limited resources and/or budget?'
  },
  {
    id: 'decisive',
    category: 'INTELLECTUAL QUALITIES',
    name: 'DECISIVE',
    description: 'Makes decisions with speed and conviction, balancing data with common sense.',
    indicators: [
      'Balances the use of data and common sense to make good decisions.',
      'Considers broad implications of decisions, without over-analysing.',
      'Makes timely decisions and moves swiftly to execution with conviction.'
    ],
    prompt: 'Think of instances when they have acted decisively, with just enough information, and then stuck with the decision.'
  },
  {
    id: 'risk_taking',
    category: 'INTELLECTUAL QUALITIES',
    name: 'RISK TAKING',
    description: 'Operates well outside their comfort zone and experiments with untested and unproven ideas.',
    indicators: [
      'Stretches beyond the limits of what comes naturally; taking bold decisions and actions.',
      'Comfortable with making mistakes and learns from them.',
      'Courageous and encourages others to take thought-through risks and be experimental.'
    ],
    prompt: 'Can you think of a time they have taken calculated risks?'
  },
  {
    id: 'simplifying',
    category: 'INTELLECTUAL QUALITIES',
    name: 'SIMPLIFYING',
    description: 'Simplifies complexities to create clarity for others.',
    indicators: [
      'Easily cuts through complex information and gets to the root of problems quickly.',
      'Communicates complex ideas in an understandable way.'
    ],
    prompt: 'Can they cut through complex information to help create clarity and problem solve an issue?'
  },
  // Emotional Qualities
  {
    id: 'aspiration',
    category: 'EMOTIONAL QUALITIES',
    name: 'ASPIRATION',
    description: 'Motivated to progress their career and seeks to have a positive impact beyond their core work.',
    indicators: [
      'Motivated to progress their career beyond current role.',
      'Aims high and disrupts, pursuing demanding goals relentlessly, enabling performance.',
      'Driven by a desire to achieve best for self and others, connecting to a bigger purpose.'
    ],
    prompt: 'Do they have clear career ambitions and goals driven through a robust development plan?'
  },
  {
    id: 'ownership',
    category: 'EMOTIONAL QUALITIES',
    name: 'OWNERSHIP',
    description: 'Proactively sets direction without waiting for guidance and follows through to completion.',
    indicators: [
      'Is a self-starter and likes taking charge.',
      'Takes on additional responsibilities beyond the formal boundaries of their role.',
      'Accepts responsibility even when things are not going well.'
    ],
    prompt: 'Think of instances when they took charge, and were proactive, delivering great results and impact.'
  },
  {
    id: 'resilient',
    category: 'EMOTIONAL QUALITIES',
    name: 'RESILIENT',
    description: 'Remains positive under pressure and recovers quickly from setback.',
    indicators: [
      'Maintains positive outlook, keeping focused under pressure.',
      'Perseveres and recovers quickly from setback.',
      'Self-assured and confident in their ability to overcome challenges.'
    ],
    prompt: 'Think of a time when they\'ve had setbacks. How did they respond? Did they embrace learnings from failure?'
  },
  // Social Qualities
  {
    id: 'self_awareness',
    category: 'SOCIAL QUALITIES',
    name: 'SELF AWARENESS',
    description: 'Understands themselves well, the impact they have on others and makes time to work on their development and personal impact.',
    indicators: [
      'Has a strong insight into their style and their impact on others.',
      'Understands their strengths and development areas.',
      'Proactively seeks and acts on feedback - quick to learn and apply themselves.'
    ],
    prompt: 'Do they demonstrate a clear understanding of their strengths and development areas and are they receptive to feedback?'
  },
  {
    id: 'environmental_radar',
    category: 'SOCIAL QUALITIES',
    name: 'ENVIRONMENTAL RADAR',
    description: 'Understands the dynamics within the organisation and people around them and uses the insights to navigate effectively.',
    indicators: [
      'Good read of situations/individuals, as well as others\' interests and what will resonate with them.',
      'Knows how to get things done in the organisation.',
      'Walks into a group setting and knows how to get the pulse of the situation.'
    ],
    prompt: 'Is able to quickly read dynamics in a team or meeting and knows how to drive results within that situation or environment?'
  },
  {
    id: 'influencing',
    category: 'SOCIAL QUALITIES',
    name: 'INFLUENCING',
    description: 'Inspires others and adapts their approach to get the best from those around them.',
    indicators: [
      'Leverages strong relationships to deliver outcomes.',
      'Draws on a variety of influencing styles to engage different audiences.',
      'Is intentional at creating an inclusive environment and efficient collaboration.'
    ],
    prompt: 'Can they skilfully mobilise a group of stakeholders to buy into their plan/ideas?'
  }
];
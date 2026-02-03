
import { Question } from './types';

export const TOTAL_QUESTIONS = 20;
export const OVERALL_TIME_LIMIT_SEC = 20 * 60;
export const QUESTION_TIME_LIMIT_SEC = 60;

export const ADMIN_PIN = "1234";

export const LEADERSHIP_STANDARDS = [
  {
    id: 'win-execution',
    title: 'Win Through Execution',
    subtitle: 'Lead bold execution in a fast moving world',
    positives: [
      'Sets and delivers against stretch goals',
      'Holds self and others to account',
      'Quickly adapts plans in the face of change',
      'Builds coherent plans and prioritises resources',
      'Simplifies and drives efficiencies',
      'Makes timely decisions and acts quickly'
    ],
    watchOuts: [
      'Sets unrealistic or conservative goals',
      'Deflects when things don\'t go to plan',
      'Gets stuck when things change',
      'Executes without a clear plan',
      'Adds in complexity',
      'Steps away from key decisions'
    ],
    questions: {
      L4: [
        'Can you give me an example of a recent goal that you set? How did you achieve it?',
        'Tell me about a time where you needed to work through others to successfully deliver a project.',
        'Tell me about a time where you have had to change your plans to get a better outcome.'
      ],
      'L5-L7': [
        'Can you give me an example of when you had to make difficult choices when delivering against plans?',
        'How do you hold yourself and others to account for high performance?',
        'Tell me about a time you adapted plans because of a change in the external environment.'
      ]
    }
  },
  {
    id: 'inspire-purpose',
    title: 'Inspire Through Purpose',
    subtitle: 'Amplify our purpose internally and externally',
    positives: [
      'Understands what drives and motivates them',
      'Shows interest in what motivates others',
      'Takes thoughtful risks based on good judgement',
      'Maintains positive outlook during challenges',
      'Builds meaningful relationships',
      'Connects with the impact of Organization purpose'
    ],
    watchOuts: [
      'Lacks self-insight into motivations',
      'Doesn\'t invest time to deeply understand others',
      'Risk averse or takes risks without consideration',
      'Comes across as being negative',
      'Shies away from difficult stakeholder relationships',
      'Does not recognise impact of Organization\'s purpose'
    ],
    questions: {
      L4: [
        'Where do you find connection with your own purpose in your current role?',
        'Give an example of a time where you were working as part of a team that was struggling to deliver.',
        'Give an example of when you had to adapt your style to influence someone.'
      ],
      'L5-L7': [
        'Give an example of a time where you identified an area of significant development for an individual/team.',
        'Give an example of how you have helped someone else explore or unlock their purpose.',
        'Give me an example of when you have led a highly effective team.'
      ]
    }
  },
  {
    id: 'shape-future',
    title: 'Shape the Future',
    subtitle: 'Creates focus and ownership for shaping Organization\'s future ambition',
    positives: [
      'Future orientated, sets bold plans',
      'Embraces uncertainty and thrives on ambiguity',
      'Communicates in clear and credible manner',
      'Seeks internal and external insights',
      'Draws meaningful insights from data points',
      'Generates and experiments with new ideas'
    ],
    watchOuts: [
      'Plans framed around current performance only',
      'Enjoys clarity and uncomfortable with ambiguity',
      'Struggles to communicate ideas simply',
      'Focuses only on internal insights',
      'Over-analyses without focus on meaning',
      'Reluctant to try new approaches'
    ],
    questions: {
      L4: [
        'Tell me about an improvement opportunity you identified and delivered recently?',
        'Where have you pushed yourself to deliver something challenging/out of comfort zone?',
        'How do you keep up-to-date with developments in your market/function?'
      ],
      'L5-L7': [
        'What emerging trends of practices could impact your current strategy?',
        'Tell me about a significant need for change you identified and implemented?',
        'What has been the most innovative thing you\'ve done at work?'
      ]
    }
  },
  {
    id: 'invest-talent',
    title: 'Invest in Talent',
    subtitle: 'Harness the full extent of Organization\'s talent and diversity',
    positives: [
      'Articulates own and team strengths/priorities',
      'Continuously looking for growth opportunities',
      'Provides and acts on feedback',
      'Understands value of diversity',
      'Aware of own biases and preferences',
      'Resilient in the face of adversity'
    ],
    watchOuts: [
      'Narrow and simplistic view on strengths',
      'Focused only on own development',
      'Concerned only about own feedback',
      'Dismissive of ideas different to own',
      'Limited self awareness of impact of biases',
      'Gets disheartened or worn down by challenges'
    ],
    questions: {
      L4: [
        'Give an example of when you had to share a difficult message or feedback.',
        'Tell me about a time you sought out a diverse viewpoint to help overcome a challenge.',
        'How do you ensure you continue to develop within your role?'
      ],
      'L5-L7': [
        'What have you done to ensure that you have a diverse and inclusive culture in your team?',
        'How do you ensure your team adapt quickly in the face of new challenges?',
        'Give an example of when you have had to deliver difficult feedback to someone.'
      ]
    }
  }
];

export const SEED_QUESTIONS: Question[] = [
  { id: 'sql-1', category: 'SQL Basics', difficulty: 'Easy', text: 'Which SQL clause filters results of an aggregate function?', options: { A: 'WHERE', B: 'HAVING', C: 'ORDER BY', D: 'GROUP BY' }, correctOption: 'B', isActive: true },
  { id: 'sql-2', category: 'SQL Basics', difficulty: 'Easy', text: 'What is the default join type if only JOIN is specified?', options: { A: 'LEFT JOIN', B: 'RIGHT JOIN', C: 'INNER JOIN', D: 'OUTER JOIN' }, correctOption: 'C', isActive: true },
  { id: 'sql-3', category: 'SQL Basics', difficulty: 'Easy', text: 'Which operator searches for a specified pattern?', options: { A: 'GET', B: 'MATCH', C: 'LIKE', D: 'SEARCH' }, correctOption: 'C', isActive: true },
  { id: 'sql-4', category: 'SQL Basics', difficulty: 'Easy', text: 'Which command removes all records but keeps table structure?', options: { A: 'DELETE', B: 'DROP', C: 'TRUNCATE', D: 'REMOVE' }, correctOption: 'C', isActive: true },
  { id: 'sql-5', category: 'SQL Basics', difficulty: 'Easy', text: 'Which keyword selects unique values?', options: { A: 'UNIQUE', B: 'DIFFERENT', C: 'DISTINCT', D: 'SINGLE' }, correctOption: 'C', isActive: true },
  
  { id: 'iq-1', category: 'IQ', difficulty: 'Medium', text: 'If 5 machines take 5 minutes to make 5 widgets, how long for 100 machines to make 100 widgets?', options: { A: '100 min', B: '50 min', C: '5 min', D: '1 min' }, correctOption: 'C', isActive: true },
  { id: 'iq-2', category: 'IQ', difficulty: 'Medium', text: 'Which word does NOT belong with the others?', options: { A: 'Leopard', B: 'Cougar', C: 'Elephant', D: 'Lion' }, correctOption: 'C', isActive: true },
  { id: 'iq-3', category: 'IQ', difficulty: 'Medium', text: 'What is the next number in the series: 1, 1, 2, 3, 5, 8, 13, ...?', options: { A: '21', B: '19', C: '24', D: '15' }, correctOption: 'A', isActive: true },
  { id: 'iq-4', category: 'IQ', difficulty: 'Medium', text: 'A bat and ball cost $1.10. The bat costs $1.00 more than the ball. How much is the ball?', options: { A: '$0.10', B: '$0.05', C: '$0.01', D: '$0.15' }, correctOption: 'B', isActive: true },
  { id: 'iq-5', category: 'IQ', difficulty: 'Medium', text: 'If you rearrange the letters "CIFAIPC" you get the name of an:', options: { A: 'City', B: 'Animal', C: 'Ocean', D: 'Country' }, correctOption: 'C', isActive: true },

  { id: 'beh-1', category: 'Behavioural', difficulty: 'Medium', text: 'When faced with a sudden change in project priorities, you should:', options: { A: 'Ignore it', B: 'Complain to management', C: 'Assess impact and adapt', D: 'Resign' }, correctOption: 'C', isActive: true },
  { id: 'beh-2', category: 'Behavioural', difficulty: 'Medium', text: 'Team diversity is important because it leads to:', options: { A: 'More arguments', B: 'Better innovation', C: 'Higher costs', D: 'Slower decisions' }, correctOption: 'B', isActive: true },
  { id: 'beh-3', category: 'Behavioural', difficulty: 'Medium', text: 'Active listening involves:', options: { A: 'Waiting to talk', B: 'Interrupting often', C: 'Summarizing and asking', D: 'Staring blankly' }, correctOption: 'C', isActive: true },
  { id: 'beh-4', category: 'Behavioural', difficulty: 'Medium', text: 'Accountability means:', options: { A: 'Blaming others', B: 'Taking ownership', C: 'Hiding mistakes', D: 'Working alone' }, correctOption: 'B', isActive: true },
  { id: 'beh-5', category: 'Behavioural', difficulty: 'Medium', text: 'Conflict in a team should be:', options: { A: 'Suppressed', B: 'Ignored', C: 'Managed constructively', D: 'Encouraged' }, correctOption: 'C', isActive: true },

  { id: 'ana-1', category: 'Analytical Ability', difficulty: 'Hard', text: 'A data set has a mean of 50 and a standard deviation of 0. This means:', options: { A: 'Data is diverse', B: 'All values are 50', C: 'Data is wrong', D: 'Mean is 0' }, correctOption: 'B', isActive: true },
  { id: 'ana-2', category: 'Analytical Ability', difficulty: 'Hard', text: 'Correlation does not imply:', options: { A: 'Relationship', B: 'Association', C: 'Causation', D: 'Coexistence' }, correctOption: 'C', isActive: true },
  { id: 'ana-3', category: 'Analytical Ability', difficulty: 'Hard', text: 'The "Join" operation in data analysis is used to:', options: { A: 'Add rows', B: 'Combine sources', C: 'Sort columns', D: 'Filter nulls' }, correctOption: 'B', isActive: true },
  { id: 'ana-4', category: 'Analytical Ability', difficulty: 'Hard', text: 'Normal distribution is often called:', options: { A: 'Bell curve', B: 'Flat line', C: 'Skewed plot', D: 'Step chart' }, correctOption: 'A', isActive: true },
  { id: 'ana-5', category: 'Analytical Ability', difficulty: 'Hard', text: 'What does "ETL" stand for?', options: { A: 'Enter Time Log', B: 'Extract Transform Load', C: 'End To Line', D: 'Easy Task List' }, correctOption: 'B', isActive: true }
];

export const generateFullSeed = (): Question[] => {
    return [...SEED_QUESTIONS];
};

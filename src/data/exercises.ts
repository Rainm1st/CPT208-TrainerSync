export interface Exercise {
  id: string
  name: string
  muscle: 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core'
  equipment: 'free_weight' | 'cable' | 'machine'
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  sets: string
  reps: string
  icon: string
  how: string
  breath: string
}

export const exercises: Exercise[] = [
  { id:'bench',    name:'Bench Press',       muscle:'chest',     equipment:'free_weight', level:'Intermediate', sets:'4-5', reps:'6-10', icon:'🏋️', how:'Lie flat, grip slightly wider than shoulder-width. Lower bar to chest, press explosively.', breath:'Inhale on the way down, exhale on the way up.' },
  { id:'incline',  name:'Incline Press',     muscle:'chest',     equipment:'free_weight', level:'Intermediate', sets:'3-4', reps:'8-12', icon:'↗️', how:'Set bench to 30-45°. Lower dumbbells to upper chest, press upward.', breath:'Controlled 2-second descent, press powerfully.' },
  { id:'dbfly',    name:'DB Fly',            muscle:'chest',     equipment:'free_weight', level:'Beginner',     sets:'3',   reps:'12-15', icon:'🦋', how:'Lie flat, slight bend in elbows. Arc dumbbells down and back up, feeling the stretch.', breath:'Deep stretch on the way down, squeeze at the top.' },
  { id:'squat',    name:'Back Squat',        muscle:'legs',      equipment:'free_weight', level:'Intermediate', sets:'4-5', reps:'5-8',  icon:'🦵', how:'Bar on traps, feet shoulder-width. Break at hips and knees simultaneously, depth below parallel.', breath:'Big breath before descent, exhale through sticking point.' },
  { id:'rdl',      name:'Romanian Deadlift', muscle:'legs',      equipment:'free_weight', level:'Intermediate', sets:'3-4', reps:'8-12', icon:'⬇️', how:'Hinge at hips, soft knee bend. Lower bar along legs until hamstring stretch, drive hips forward.', breath:'Inhale at top, exhale on the way up.' },
  { id:'legpress', name:'Leg Press',         muscle:'legs',      equipment:'machine',     level:'Beginner',     sets:'3-4', reps:'10-15', icon:'🦿', how:'Feet shoulder-width on platform. Lower platform until 90° knee angle, press through heels.', breath:'Exhale on the press, inhale on the return.' },
  { id:'pullup',   name:'Pull-Up',           muscle:'back',      equipment:'free_weight', level:'Advanced',     sets:'3-4', reps:'max',  icon:'💪', how:'Hang with pronated grip, pull until chin over bar. Control the descent.', breath:'Exhale as you pull, inhale on the way down.' },
  { id:'pulldown', name:'Lat Pulldown',      muscle:'back',      equipment:'cable',       level:'Beginner',     sets:'3-4', reps:'10-12', icon:'🔽', how:'Sit tall, pull bar to upper chest. Squeeze lats at the bottom, control the ascent.', breath:'Exhale as you pull, inhale as you release.' },
  { id:'row',      name:'Seated Cable Row',  muscle:'back',      equipment:'cable',       level:'Beginner',     sets:'3',   reps:'10-12', icon:'🚣', how:'Sit upright, pull handle to navel. Squeeze shoulder blades together.', breath:'Exhale on the pull, inhale on the return.' },
  { id:'ohp',      name:'Overhead Press',    muscle:'shoulders', equipment:'free_weight', level:'Intermediate', sets:'3-4', reps:'6-10', icon:'🏋️', how:'Bar at clavicle level, press overhead. Keep core tight, avoid lumbar hyperextension.', breath:'Exhale on the press, inhale on the descent.' },
  { id:'lateral',  name:'Lateral Raise',     muscle:'shoulders', equipment:'free_weight', level:'Beginner',     sets:'3-4', reps:'12-15', icon:'✈️', how:'Slight bend in elbow, raise arms to shoulder height. Control the descent.', breath:'Exhale on the raise, inhale on the way down.' },
  { id:'curl',     name:'Barbell Curl',      muscle:'arms',      equipment:'free_weight', level:'Beginner',     sets:'3',   reps:'10-12', icon:'💪', how:'Supinated grip, curl bar to chin. Keep elbows pinned to sides.', breath:'Exhale on the curl, inhale on the descent.' },
  { id:'tricep',   name:'Tricep Pushdown',   muscle:'arms',      equipment:'cable',       level:'Beginner',     sets:'3',   reps:'12-15', icon:'⬇️', how:'Hinge at elbow, push bar down to full extension. Keep upper arm vertical.', breath:'Exhale on extension, inhale on return.' },
  { id:'plank',    name:'Plank',             muscle:'core',      equipment:'free_weight', level:'Beginner',     sets:'3',   reps:'60s',  icon:'🟥', how:'Forearms on floor, keep body straight from head to heels. Brace abs, don\'t let hips sag.', breath:'Steady rhythmic breathing throughout.' },
]

/* Psychopathology course data.
 * Original explanatory paraphrases sourced solely from:
 * Barlow, Durand & Hofmann, Psychopathology: An Integrative Approach to Mental Disorders,
 * 9th ed. (2023), ch. 1. No publisher content or full textbook is redistributed.
 */
(()=>{'use strict';
const chapters=[
'Psychopathology in Historical Context',
'An Integrative Approach to Psychopathology',
'Clinical Assessment and Diagnosis',
'Research Methods',
'Anxiety, Trauma- and Stressor-Related, and Obsessive-Compulsive and Related Disorders',
'Somatic Symptom and Related Disorders and Dissociative Disorders',
'Mood Disorders and Suicide',
'Eating and Sleep-Wake Disorders',
'Physical Disorders and Health Psychology',
'Sexual Dysfunctions, Paraphilic Disorders, and Gender Dysphoria',
'Substance-Related, Addictive, and Impulse-Control Disorders',
'Personality Disorders',
'Schizophrenia Spectrum and Other Psychotic Disorders',
'Neurodevelopmental Disorders',
'Neurocognitive Disorders',
'Mental Health Services: Legal and Ethical Issues'
].map((title,i)=>({id:'ch'+(i+1),number:i+1,title,startPage:[2,30,72,102,124,180,210,266,318,356,400,444,480,516,548,574][i]}));
const topics=[
{id:'definition',chapter:1,title:'What Is a Psychological Disorder?',page:'3–5',kind:'lesson',
simple:'A psychological disorder is not simply unusual behavior. The textbook asks whether psychological functioning is disrupted, whether distress or impairment is involved, and how the response fits its cultural context.',
advanced:[
'Psychological dysfunction concerns cognition, emotion, or behavior. The authors emphasize that dysfunction exists on a continuum, so distinguishing mild variations from clinically significant disturbance can be difficult.',
'Distress and impairment are important but neither is decisive in isolation. Distress occurs in ordinary life, while some disorders can involve serious impairment without the person experiencing the behavior as distressing.',
'Atypicality also requires care: statistical rarity or a violation of social expectations alone does not make a behavior a disorder. Cultural context, function, and the broader clinical picture matter.',
'The book discusses competing attempts to define disorder, including harmful dysfunction, diagnostic prototypes, and dimensional severity, rather than presenting one infallible dividing line.'
],
example:'In the chapter’s clinical vignette, 16-year-old Janelle develops blood-injection-injury phobia after seeing distressing blood-related images. She avoids reminders and faints repeatedly, sometimes in class, disrupting her education. The text contrasts her severe impairment with milder reactions to blood.',examplePage:'2–3',
question:'Does unusual behavior by itself establish a psychological disorder?',choices:['Yes, rarity is sufficient','No, dysfunction, distress or impairment, and context also matter','Yes, whenever social norms are violated'],correct:1,reason:'The textbook explicitly warns that no single criterion is sufficient to define a psychological disorder.'},
{id:'science',chapter:1,title:'The Science of Psychopathology',page:'6–8',kind:'lesson',
simple:'Psychopathology is the scientific study of psychological disorders. Professionals study what disorders look like, what contributes to them, and how treatment works.',
advanced:[
'The textbook distinguishes clinical professions while showing that investigation, assessment, and treatment often overlap. Clinical psychologists, psychiatrists, psychiatric nurses, social workers, and other professionals contribute from different training backgrounds.',
'The scientist–practitioner approach means clinicians use research findings while also evaluating their work systematically. The book organizes questions about disorders around description, causation, and treatment and outcomes.'
],
question:'Which set best reflects the textbook’s central research questions?',choices:['Description, causation, treatment and outcomes','Only brain chemistry','Only prevalence'],correct:0,reason:'The chapter describes research into what disorders are, why they arise, and how interventions work.'},
{id:'supernatural',chapter:1,title:'The Supernatural Tradition',page:'8–11',kind:'lesson',
simple:'Historically, some communities explained unusual behavior through spirits, demons, cosmic forces, and other supernatural influences.',
advanced:[
'The authors describe supernatural explanations as a major historical tradition, alongside biological and psychological approaches. Interpretations of troubling behavior often reflected wider beliefs about good and evil, possession, and external agents.',
'The chapter discusses demonological explanations, possession-related treatments, mass hysteria, and beliefs involving the moon and stars. These are presented as historical explanations; the authors do not treat astrology as scientifically established causation.'
],
question:'How does the book treat supernatural explanations of psychopathology?',choices:['As historically important beliefs','As proven modern causes','As identical to scientific neuroscience'],correct:0,reason:'These explanations are surveyed for their historical role, not endorsed as evidence-based causes.'},
{id:'biological',chapter:1,title:'The Biological Tradition',page:'12–14',kind:'lesson',
simple:'This tradition looked for physical and bodily explanations for disturbances in thoughts, feelings, and behavior.',
advanced:[
'The book discusses Hippocrates and Galen as important early contributors. Hippocrates associated functions such as emotion and intelligence with the brain and considered bodily disease, injury, heredity, and psychological factors in understanding disorders.',
'The authors then trace the nineteenth-century biological tradition and the development of treatments. The historical value of biological ideas does not imply that every treatment proposed at the time was scientifically justified.'
],
question:'What was significant about the Hippocratic tradition in the textbook?',choices:['It considered bodily and brain-related causes','It rejected every physical explanation','It claimed cultural context never matters'],correct:0,reason:'The chapter explains early attempts to consider disorders as conditions with bodily causes.'},
{id:'psychological',chapter:1,title:'The Psychological Tradition',page:'15–24',kind:'lesson',
simple:'This tradition investigated how experiences, emotions, learning, thinking, and relationships might contribute to psychological problems.',
advanced:[
'The textbook reviews moral therapy and asylum reform, then influential psychoanalytic, humanistic, and behavioral approaches. Their histories help explain the evolution of psychological treatment.',
'Psychoanalytic theory placed importance on unconscious processes. Humanistic approaches emphasized human potential and therapeutic understanding. Behavioral and cognitive-behavioral approaches stressed the role of learning and observable or testable processes. The authors also discuss limits of one-dimensional accounts.'
],
question:'Which approaches are treated within the psychological tradition?',choices:['Psychoanalytic, humanistic, behavioral','Only supernatural explanations','Only genetics'],correct:0,reason:'The chapter explicitly surveys these psychological approaches.'},
{id:'integrative',chapter:1,title:'Scientific Method and Integrative Approach',page:'25–26',kind:'lesson',
simple:'The authors argue that biological, psychological, social, and developmental factors interact. A disorder should not be explained by just one factor in isolation.',
advanced:[
'The concluding chapter section integrates research in neuroscience, behavioral and cognitive science, and life-span development. Each influence operates within a system of other influences.',
'This theme prepares for Chapter 2, which develops a multidimensional approach to causation. A single-factor explanation such as a purely biological or purely environmental cause can leave out essential interactions.'
],
question:'What is the core message of an integrative model?',choices:['One cause always explains a disorder','Contributing factors interact across dimensions','Clinical experience replaces scientific evidence'],correct:1,reason:'The authors emphasize interacting dimensions rather than one-dimensional causation.'},
{id:'dysfunction',chapter:1,parent:'definition',title:'Psychological Dysfunction',page:'3–4',kind:'concept',
simple:'A disruption in cognitive, emotional, or behavioral functioning.',
advanced:['Mild disruptions may also occur in ordinary life. The textbook stresses the problem of identifying when functioning crosses a clinically meaningful threshold.']},
{id:'distress',chapter:1,parent:'definition',title:'Distress or Impairment',page:'4',kind:'concept',
simple:'Significant suffering or reduced ability to function in daily life.',
advanced:['Subjective distress and functional limitations are related but distinct. Some people experience considerable distress without a disorder, and some disorders involve limited perceived distress.']},
{id:'context',chapter:1,parent:'definition',title:'Atypicality and Cultural Context',page:'4–5',kind:'concept',
simple:'Consider whether a response is unusual or culturally unexpected, without treating difference itself as pathology.',
advanced:['Statistical rarity is not enough to define a disorder. The authors caution that culturally accepted practices can look atypical to outsiders, while social norms are not by themselves diagnostic standards.']}
];
window.PsychDeskPsychopathologyContent=Object.freeze({
 book:'Psychopathology: An Integrative Approach to Mental Disorders',
 edition:'Ninth edition · 2023',authors:'David H. Barlow · V. Mark Durand · Stefan G. Hofmann',
 chapters,topics,
 // Cross-concept connections connect nearby ideas discussed across chapter 1 (interpretive study links, not causal findings).
 links:[['definition','science'],['definition','integrative'],['supernatural','biological'],['biological','psychological'],['psychological','integrative'],['integrative','ch2']]
});
})();
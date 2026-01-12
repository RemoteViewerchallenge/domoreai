import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const UI_SRC_DIR = path.resolve(process.cwd(), '../../apps/ui/src');

function findGhostButtons() {
  console.log('👻 Starting Ghost UI Analysis...');

  const files = globSync(`${UI_SRC_DIR}/**/*.tsx`);
  let totalButtons = 0;
  let ghostButtons = 0;
  let todoButtons = 0;

  console.log(`Scanning ${files.length} UI files...\n`);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Naive state machine to find <Button ... > blocks
    // This allows us to capture multi-line definitions
    let displayPath = path.relative(UI_SRC_DIR, file);
    let index = 0;
    
    while ((index = content.indexOf('<Button', index)) !== -1) {
      totalButtons++;
      
      // Find the end of the opening tag (matching > but ignoring inside quotes/braces ideally)
      // For simplicity, we just look for the first > that isn't part of an arrow function or string... 
      // ACTUALLY, let's just grab a chunk of chars (e.g. 500) and regex it, or simple scan.
      
      // Let's find the closing '>' of the tag. 
      let endIndex = index;
      let depth = 0; // for braces {}
      let inString = false;
      let stringChar = '';
      
      for (let i = index + 7; i < content.length; i++) {
        const char = content[i];
        
        if (inString) {
          if (char === stringChar && content[i-1] !== '\\') {
            inString = false;
          }
        } else {
          if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
          } else if (char === '{') {
            depth++;
          } else if (char === '}') {
            depth--;
          } else if (char === '>' && depth === 0) {
            endIndex = i;
            break;
          }
        }
      }

      const buttonTag = content.substring(index, endIndex + 1);
      
      // Analyze the tag content
      const hasOnClick = /onClick=\{/.test(buttonTag);
      const hasTypeSubmit = /type=["']submit["']/.test(buttonTag);
      const hasSpread = /\{\.\.\./.test(buttonTag); // {...props} might hide onClick
      const hasDisabled = /disabled=\{true\}/.test(buttonTag) || /disabled\s*$/.test(buttonTag); // Static disabled
      const hasAsChild = /asChild/.test(buttonTag);
      
      const isGhost = !hasOnClick && !hasTypeSubmit && !hasSpread && !hasDisabled && !hasAsChild;
      
      // Check for TODOs in onClick
      const isTodo = hasOnClick && (/console\.log\(['"`]TODO/.test(buttonTag) || /alert\(['"`]TODO/.test(buttonTag) || /\/\/\s*TODO/.test(buttonTag));

      // Check for Empty function
      const isEmpty = hasOnClick && /onClick=\{\(\)\s*=>\s*(\{\}|void 0|null|undefined)\}/.test(buttonTag.replace(/\s+/g, ''));


      if (isGhost) {
        // Double check it's not a closed tag like </Button> which indexOf match wouldn't catch anyway because we match <Button
        // But indexOf('<Button') matches attributes too? No, space required or end.
        // Actually <Button is prefix.
        
        // Also check if it is part of a larger component name like <ButtonSomething
        const nextChar = content[index + 7];
        if (!/[\s/>]/.test(nextChar)) {
           // Not a Button component, maybe ButtonGroup
           index++; // move past
           totalButtons--; // correct count
           continue; 
        }

        console.log(`Endpoint: ${displayPath}`);
        console.log(`Line: ${content.substring(0, index).split('\n').length}`);
        console.log(`Type: 👻 NO INTERACTION`);
        console.log(`Code: ${buttonTag.replace(/\n\s*/g, ' ')}`);
        console.log('---');
        ghostButtons++;
      } else if (isTodo || isEmpty) {
         console.log(`Endpoint: ${displayPath}`);
         console.log(`Line: ${content.substring(0, index).split('\n').length}`);
         console.log(`Type: 🚧 TODO / EMPTY`);
         console.log(`Code: ${buttonTag.replace(/\n\s*/g, ' ')}`);
         console.log('---');
         todoButtons++;
      }

      index = endIndex + 1;
    }
  }

  console.log(`\n📊 Analysis Results:`);
  console.log(`Total Buttons Scanned: ${totalButtons}`);
  console.log(`👻 Ghost Buttons (No Click/Submit): ${ghostButtons}`);
  console.log(`🚧 Incomplete Buttons (TODO/Empty): ${todoButtons}`);
  
  if (ghostButtons > 0 || todoButtons > 0) {
    console.log(`\n💡 Recommendation: Review these buttons. They might be visual placeholders or abandoned features.`);
  } else {
    console.log(`\n✨ Clean! No ghost buttons found.`);
  }
}

findGhostButtons();

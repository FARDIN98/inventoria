// Debug script to check frontend data
// Run this in browser console

console.log('🔍 Frontend Debug Script');

// Check if inventories data is available in the component
const checkInventoryData = () => {
  // Try to find inventory elements
  const inventoryRows = document.querySelectorAll('[data-inventory-id]');
  console.log('Found inventory rows:', inventoryRows.length);
  
  // Check owner cells
  const ownerCells = document.querySelectorAll('td');
  ownerCells.forEach((cell, index) => {
    if (cell.textContent.includes('Unknown') || cell.textContent.includes('fardinahmed66')) {
      console.log(`Owner cell ${index}:`, {
        textContent: cell.textContent,
        innerHTML: cell.innerHTML
      });
    }
  });
};

// Check React component state
const checkReactState = () => {
  // Try to access React DevTools data
  const reactRoot = document.querySelector('#__next');
  if (reactRoot && reactRoot._reactInternalFiber) {
    console.log('React fiber found');
  }
};

checkInventoryData();
checkReactState();

// Also check if translation is working
console.log('Translation test:', {
  unknown: 'Unknown',
  language: navigator.language
});
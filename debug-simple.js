// Script de debug simple pour tester l'upload
console.log('🧪 Script de debug upload démarré');

// Simuler une requête PUT simple pour voir les logs serveur
const testData = {
    reason: 'Test de mise à jour simple'
};

console.log('📤 Test des logs serveur - ouvrez l\'interface web et faites un upload');
console.log('📋 Les logs apparaîtront dans le terminal du serveur');
console.log('⚠️ Assurez-vous d\'avoir un token valide dans votre session browser');

// Afficher les informations importantes
console.log('\n📊 Configuration actuelle:');
console.log('- Frontend: http://localhost:3003');
console.log('- Backend: http://localhost:3000');
console.log('- Route test: PUT /api/hr/leaves/{id}');
console.log('- Logs détaillés activés dans LeaveController.update()');

console.log('\n🎯 Pour tester:');
console.log('1. Ouvrir http://localhost:3003 dans le navigateur');
console.log('2. Se connecter avec un compte valide');
console.log('3. Aller dans RH > Gestion des Congés');
console.log('4. Modifier un congé maladie existant en ajoutant un fichier');
console.log('5. Observer les logs dans le terminal du serveur backend');

console.log('\n✅ Script terminé - surveillez maintenant les logs du serveur backend');
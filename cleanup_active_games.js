const db = require('./db');

/**
 * Nettoie les parties actives qui sont trop anciennes (plus de 24h)
 * À exécuter périodiquement (par exemple avec un cron job)
 */
function cleanupOldActiveGames() {
	const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 heures en millisecondes
	
	return new Promise((resolve, reject) => {
		db.run(`DELETE FROM active_games WHERE start_time < ?`, [oneDayAgo], function(err) {
			if (err) return reject(err);
			
			console.log(`Nettoyage terminé: ${this.changes} parties anciennes supprimées.`);
			resolve(this.changes);
		});
	});
}

// Si ce script est exécuté directement
if (require.main === module) {
	cleanupOldActiveGames()
		.then(deletedCount => {
			console.log(`Script de nettoyage terminé. ${deletedCount} entrées supprimées.`);
			process.exit(0);
		})
		.catch(error => {
			console.error('Erreur lors du nettoyage:', error);
			process.exit(1);
		});
}

module.exports = { cleanupOldActiveGames };

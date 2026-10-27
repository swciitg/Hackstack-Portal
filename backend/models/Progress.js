const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
		completedChapters: [{ type: mongoose.Schema.Types.ObjectId }],
		completedDays: [{ type: mongoose.Schema.Types.ObjectId }],
		attemptedQuizIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
		quizScores: [
			{
				dayId: { type: mongoose.Schema.Types.ObjectId },
				score: { type: Number },
				userAnswers: [{ type: Number }]
			}
		],
		currentChapterId: { type: mongoose.Schema.Types.ObjectId },
		currentDayId: { type: mongoose.Schema.Types.ObjectId },
		moduleCompleted: { type: Boolean, default: false },
		completedAt: { type: Date, default: null }
	},
	{ timestamps: true }
);

// Ensure a user can only have one progress record per module.
progressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.models.Progress || mongoose.model('Progress', progressSchema);
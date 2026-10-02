import ExerciseImporter from "./ExerciseImporter";

// Admin access to this page is enforced by middleware, and '/api/exercises/create' verifies admin status itself
export default function AdminBulkInputPage() {
    return <ExerciseImporter />;
}

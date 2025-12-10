-- Create function to prevent DELETE operations unless explicitly allowed
CREATE OR REPLACE FUNCTION prevent_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the session variable 'app.allow_delete' is set to 'true'
    IF current_setting('app.allow_delete', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Hard DELETE is not allowed on table %. Use soft delete (set deletedAt) or enable app.allow_delete session variable.', TG_TABLE_NAME;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to critical tables
-- These triggers will prevent hard DELETE unless app.allow_delete session variable is 'true'

CREATE TRIGGER prevent_hard_delete_provider_config
    BEFORE DELETE ON "ProviderConfig"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER prevent_hard_delete_model
    BEFORE DELETE ON "model_registry"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER prevent_hard_delete_role
    BEFORE DELETE ON "Role"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER prevent_hard_delete_model_config
    BEFORE DELETE ON "ModelConfig"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER prevent_hard_delete_workspace
    BEFORE DELETE ON "Workspace"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER prevent_hard_delete_work_order_card
    BEFORE DELETE ON "WorkOrderCard"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER prevent_hard_delete_project
    BEFORE DELETE ON "Project"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER prevent_hard_delete_job
    BEFORE DELETE ON "Job"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER prevent_hard_delete_task
    BEFORE DELETE ON "Task"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_hard_delete();

-- Note: To allow hard deletes in admin contexts, set the session variable:
-- SET LOCAL app.allow_delete = 'true';

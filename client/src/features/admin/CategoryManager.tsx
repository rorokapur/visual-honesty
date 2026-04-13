import {
  Anchor,
  Box,
  Button,
  Container,
  Flex,
  Group,
  LoadingOverlay,
  Table,
  TextInput,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  addCategory,
  deleteCategory,
  fetchAdminCategories,
  type AdminCategory,
} from "../../lib/admin";

/**
 * UI to manage stimulus category labels
 * @component
 */
export function CategoryManager() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Fetches stimulus categories from backend
   */
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminCategories();
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch category list on component load
  useEffect(() => {
    fetchCategories();
  }, []);

  /**
   * Attempts to add a new category to the backend.
   */
  const handleAdd = async () => {
    if (!newName) return;
    setLoading(true);
    try {
      await addCategory(newName);
      setNewName("");
      fetchCategories();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      alert(message);
      setLoading(false);
    }
  };

  /**
   * Attempts to delete an existing category from the backend.
   * Deletion may fail if a category is tied to existing stimuli
   * due to foreign key constrains in the db.
   */
  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    setLoading(true);
    try {
      await deleteCategory(name);
      fetchCategories();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      alert(message);
      setLoading(false);
    }
  };

  return (
    <Container>
      <Flex justify={"space-between"} mb="md">
        <Title order={3}>Category Manager</Title>
        <Group align="flex-end">
          <TextInput
            placeholder="New Category (e.g. Birds)"
            size="sm"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />
          <Button
            onClick={handleAdd}
            variant="outline"
            size="sm"
            disabled={!newName || loading}
          >
            Add Category
          </Button>
        </Group>
      </Flex>

      <Box pos="relative" mih={200}>
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th style={{ width: 100 }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {categories.map((c) => (
              <Table.Tr key={c.name}>
                <Table.Td>{c.name}</Table.Td>
                <Table.Td>
                  <Anchor
                    c="red"
                    size="sm"
                    onClick={() => handleDelete(c.name)}
                  >
                    Delete
                  </Anchor>
                </Table.Td>
              </Table.Tr>
            ))}
            {categories.length === 0 && !loading && (
              <Table.Tr>
                <Table.Td colSpan={2} ta="center">
                  No categories found.
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Box>
    </Container>
  );
}

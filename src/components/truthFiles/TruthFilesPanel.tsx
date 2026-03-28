import React, { useState, useEffect } from 'react';
import { List, Card, Button, Input, Space, Modal, Typography, Tag, Tooltip, message, Popconfirm } from 'antd';
import { 
  FileTextOutlined, 
  EditOutlined, 
  SaveOutlined, 
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { TruthFile } from '../../types';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface TruthFilesPanelProps {
  files: TruthFile[];
  onSave: (file: TruthFile) => void;
  onReload?: () => void;
  projectPath?: string;
}

const FILE_DESCRIPTIONS: Record<string, { name: string; description: string; icon: string }> = {
  'current_state.md': { name: '当前世界状态', description: '时间线、地点、关键物品', icon: '🌍' },
  'resource_ledger.md': { name: '资源账本', description: '货币、物品、属性', icon: '💰' },
  'pending_hooks.md': { name: '待处理伏笔', description: '伏笔铺设与回收记录', icon: '🪝' },
  'chapter_summaries.md': { name: '章节摘要', description: '章节进度与核心事件', icon: '📑' },
  'subplot_board.md': { name: '支线进度板', description: '支线任务与进度', icon: '📋' },
  'emotional_arcs.md': { name: '情感弧线', description: '角色情感变化轨迹', icon: '💗' },
  'character_matrix.md': { name: '角色交互矩阵', description: '角色信息与关系', icon: '👥' },
};

const TruthFilesPanel: React.FC<TruthFilesPanelProps> = ({
  files,
  onSave,
  onReload,
  projectPath,
}) => {
  const [selectedFile, setSelectedFile] = useState<TruthFile | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Record<string, string>>({});

  const handleEdit = (file: TruthFile) => {
    setSelectedFile(file);
    setEditedContent(file.content);
    setIsModalOpen(true);
    setIsDirty(false);
  };

  const handleContentChange = (value: string) => {
    setEditedContent(value);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (selectedFile) {
      onSave({
        ...selectedFile,
        content: editedContent,
      });
      setIsDirty(false);
      setLastSaved({
        ...lastSaved,
        [selectedFile.name]: new Date().toISOString(),
      });
      setIsModalOpen(false);
      message.success(`${FILE_DESCRIPTIONS[selectedFile.name]?.name || selectedFile.name} 保存成功`);
    }
  };

  const handleCloseModal = () => {
    if (isDirty) {
      Modal.confirm({
        title: '有未保存的更改',
        content: '确定要关闭吗？未保存的更改将丢失。',
        okText: '保存',
        cancelText: '不保存',
        onOk: () => {
          handleSave();
        },
        onCancel: () => {
          setIsModalOpen(false);
          setIsDirty(false);
        },
      });
    } else {
      setIsModalOpen(false);
    }
  };

  const formatLastSaved = (fileName: string) => {
    const savedTime = lastSaved[fileName];
    if (savedTime) {
      const date = new Date(savedTime);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return null;
  };

  const getFileInfo = (name: string) => {
    return FILE_DESCRIPTIONS[name] || { name: name.replace('.md', ''), description: '', icon: '📄' };
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Truth Files</Text>
        {onReload && (
          <Tooltip title="重新加载">
            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={onReload} />
          </Tooltip>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        <List
          size="small"
          locale={{ emptyText: '暂无 Truth Files' }}
          dataSource={files}
          renderItem={(file) => {
            const info = getFileInfo(file.name);
            const saved = formatLastSaved(file.name);
            
            return (
              <List.Item
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  marginBottom: 4,
                  cursor: 'pointer',
                  border: '1px solid transparent',
                }}
                className="truth-file-item"
                onClick={() => handleEdit(file)}
                actions={[
                  <Button
                    key="edit"
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(file);
                    }}
                  />
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: 8, 
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}>
                      {info.icon}
                    </div>
                  }
                  title={
                    <Space>
                      <Text>{info.name}</Text>
                      {saved && (
                        <Tooltip title={`上次保存: ${saved}`}>
                          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 10 }} />
                        </Tooltip>
                      )}
                    </Space>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {info.description}
                    </Text>
                  }
                />
              </List.Item>
            );
          }}
        />
      </div>

      <Modal
        title={
          <Space>
            <span>{getFileInfo(selectedFile?.name || '').icon}</span>
            <span>{getFileInfo(selectedFile?.name || '').name}</span>
            {isDirty && <Tag color="warning">未保存</Tag>}
          </Space>
        }
        open={isModalOpen}
        onOk={handleSave}
        onCancel={handleCloseModal}
        width={800}
        okText="保存"
        cancelText="关闭"
        footer={
          <Space>
            <Button onClick={handleCloseModal}>关闭</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} disabled={!isDirty}>
              保存
            </Button>
          </Space>
        }
      >
        {selectedFile && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                文件：{selectedFile.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                字符数：{editedContent.length}
              </Text>
            </div>
            <TextArea
              value={editedContent}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={25}
              style={{
                fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                fontSize: 13,
                lineHeight: 1.6,
              }}
              placeholder="在此编辑内容..."
            />
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default TruthFilesPanel;
